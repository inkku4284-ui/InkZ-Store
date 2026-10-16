"""THE RINGS / FORM 001 — machined hoop edition, Blender 4.3+.
Reproduce: blender --background --threads 4 --python scripts/build-rings.py
Original swept solid geometry, not torus primitives or concept-image planes.
"""
import bpy, bmesh, math, json, gzip, struct, os
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
TAU = math.tau
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials): bpy.data.materials.remove(block)
root = bpy.data.objects.new('THE_RINGS_FORM_001', None); bpy.context.collection.objects.link(root)
asset = []

def material(name, color, metal, roughness, emission=0):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = roughness
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return mat
black = material('Black_Chrome', (.105,.112,.125), 1, .105)
titanium = material('Brushed_Titanium', (.57,.59,.62), 1, .25)
chrome = material('Polished_Silver', (.81,.83,.86), 1, .115)
gunmetal = material('Dark_Gunmetal', (.07,.075,.085), 1, .23)
recess = material('Recessed_Graphite', (.008,.009,.012), .75, .34)
light = material('Embedded_Red', (.72,.001,.008), .35, .2, 5)
mark = material('INKZ_Silver_Inlay', (.85,.85,.83), .35, .22)
# A real exportable PBR roughness map: fine circumferential tool marks, no
# unexportable procedural shader graph. glTF packs this into its G channel.
image = bpy.data.images.new('Machining_Roughness', width=512, height=128, alpha=False)
image.colorspace_settings.name = 'Non-Color'
pixels = []
for y in range(128):
    for x in range(512):
        fine = ((x*73856093 ^ y*19349663) % 101) / 100
        roughness = .235 + .025*math.sin(y*2.31) + .014*math.sin(y*.43) + .012*(fine-.5)
        pixels.extend((roughness,roughness,roughness,1))
image.pixels.foreach_set(pixels)
image.filepath_raw = str(ROOT/'assets/source/rings-machining.png'); image.file_format = 'PNG'; image.save(); image.pack()
shader = titanium.node_tree.nodes.get('Principled BSDF')
tex = titanium.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image
split = titanium.node_tree.nodes.new('ShaderNodeSeparateColor')
titanium.node_tree.links.new(tex.outputs['Color'], split.inputs['Color'])
titanium.node_tree.links.new(split.outputs['Green'], shader.inputs['Roughness'])

def mesh_object(name, vertices, faces, mat, parent=root, uv=None):
    mesh = bpy.data.meshes.new(name+'_mesh'); mesh.from_pydata(vertices, [], faces); mesh.update()
    bm = bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    if uv:
        layer = mesh.uv_layers.new(name='Machining_UV')
        for poly in mesh.polygons:
            for loop in poly.loop_indices: layer.data[loop].uv = uv[mesh.loops[loop].vertex_index]
    obj = bpy.data.objects.new(name, mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat); obj.parent = parent
    for poly in mesh.polygons: poly.use_smooth = True
    asset.append(obj); return obj

def hoop(name, radius, wall, width, mat, parent=root, start=0, arc=TAU, z=0, segments=96):
    """Cylindrical bracelet, broad curved radial face, bevelled cross section.
    Width runs ALONG the axis; unlike the old flat radial annular washers.
    """
    bevel = min(.012, wall*.28, width*.2)
    inner, outer, half = radius-wall/2, radius+wall/2, width/2
    profile = [(outer-bevel,-half),(outer,-half+bevel),(outer,half-bevel),(outer-bevel,half),
               (inner+bevel,half),(inner,half-bevel),(inner,-half+bevel),(inner+bevel,-half)]
    if width < .06: profile = [(outer,-half),(outer,half),(inner,half),(inner,-half)]
    n = len(profile)
    steps = max(3,round(segments*arc/TAU)); closed = abs(arc-TAU)<1e-6
    count = steps+1 # duplicate seam provides continuous UVs
    vertices=[]; uv=[]; faces=[]
    for i in range(count):
        a = start+i/steps*arc
        for j,(r,d) in enumerate(profile):
            vertices.append((r*math.cos(a),r*math.sin(a),z+d)); uv.append((a/TAU,(d+half)/width))
    for i in range(steps):
        for j in range(n): faces.append((i*n+j,i*n+(j+1)%n,(i+1)*n+(j+1)%n,(i+1)*n+j))
    if not closed: faces.extend([tuple(reversed(range(n))),tuple(steps*n+j for j in range(n))])
    obj=mesh_object(name,vertices,faces,mat,parent,uv if mat == titanium else None)
    return obj

def sphere(name,radius,position,mat,parent=root,segments=48,rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=radius)
    obj=bpy.context.object; obj.name=name; obj.parent=parent; obj.location=position; obj.data.materials.append(mat)
    for poly in obj.data.polygons: poly.use_smooth=True
    asset.append(obj); return obj

def join(objects,name):
    bpy.ops.object.select_all(action='DESELECT')
    # Apply edge-normal modifiers before joining; preserve each ring's pivot.
    for obj in objects:
        bpy.context.view_layer.objects.active=obj
        for mod in list(obj.modifiers): bpy.ops.object.modifier_apply(modifier=mod.name)
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join()
    result=bpy.context.object; result.name=name
    asset[:]=[o for o in asset if o not in objects]+[result]
    return result

camera_position=Vector((3.4,-7,2.5)); toward=camera_position.normalized()
right=Vector((0,0,1)).cross(toward).normalized(); up=toward.cross(right).normalized()
def orient(obj, normal):
    obj.rotation_mode='QUATERNION'; obj.rotation_quaternion=Vector((0,0,1)).rotation_difference(normal.normalized())

core=sphere('INKZ_Core',.77,(0,0,0),black,segments=48,rings=24)
ring_specs=[('Ring_Primary',1.62,.40,(-.70,.60,.40)),('Ring_Secondary',1.37,.32,(.87,.24,.43)),('Ring_Tertiary',1.88,.29,(.13,-.84,.53))]
for ring_index,(name,radius,width,normal) in enumerate(ring_specs):
    ring=hoop(name,radius,.105,width,gunmetal)
    orient(ring,right*normal[0]+up*normal[1]+toward*normal[2])
    # Individual curved titanium panels, actual open seams and cut bevel ends.
    panels=[]
    for i in range(24):
        panels.append(hoop('Panel',radius+.057,.012,width-.075,titanium,ring,start=i*TAU/24+.0035,arc=TAU/24-.007,segments=128))
    join(panels,name.replace('Ring_','')+'_Titanium_Panels')
    rails=[]
    for side in (-1,1):
        rails.append(hoop('Rail',radius+.046,.026,.025,chrome,ring,z=side*(width/2-.013)))
        rails.append(hoop('Inner_Rail',radius-.046,.018,.018,chrome,ring,z=side*(width/2-.014)))
    join(rails,name.replace('Ring_','')+'_Polished_Rails')
    grooves=[hoop('Recess',radius+.065,.003,.009,recess,ring,z=width*.13)]
    # Inset tool pockets in selected panels, deliberately sparse and repeatable.
    for i in range(0,24,3):
        grooves.append(hoop('Service_Pocket',radius+.064,.004,.038,recess,ring,start=i*TAU/24+.045,arc=.041,z=-width*.17,segments=128))
    join(grooves,name.replace('Ring_','')+'_Recesses')
    # Inner channel housings surround segmented luminous inserts.
    housing=[hoop('Channel_Housing',radius-.055,.018,.042,recess,ring,z=side*width*.28) for side in (-1,1)]
    join(housing,name.replace('Ring_','')+'_Channel_Housings')
    channels=[]
    for side in (-1,1):
        for start,arc in [(.12,1.4),(1.83,1.15),(3.38,1.45),(5.17,.68)]:
            channels.append(hoop('Light_Insert',radius-.065,.008,.019,light,ring,start=start+ring_index*.23,arc=arc,z=side*width*.28))
    # A single recessed outer arc catches the eye without outlining every edge.
    channels.append(hoop('Outer_Insert',radius+.065,.004,.013,light,ring,start=3.45+ring_index*.6,arc=.92,z=-width*.30))
    join(channels,['Accent_Light_A','Accent_Light_B','Accent_Light_C'][ring_index])
    bolts=[]
    for i in range(12):
        a=(i+.35)*TAU/12
        bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.014,depth=.006)
        bolt=bpy.context.object; bolt.name='Flush_Fastener'; bolt.parent=ring
        bolt.location=((radius+.065)*math.cos(a),(radius+.065)*math.sin(a),width*.27)
        bolt.rotation_euler=Vector((math.cos(a),math.sin(a),0)).to_track_quat('Z','Y').to_euler()
        bolt.data.materials.append(gunmetal); asset.append(bolt); bolts.append(bolt)
    join(bolts,name.replace('Ring_','')+'_Flush_Fasteners')
# Two fine load-bearing orbital filaments and attached satellite nodes.
for i,normal in enumerate([(.22,.89,.24),(-.78,-.3,.34)]):
    orbit=hoop('Orbit_Filament_'+str(i+1),2.10,.017,.020,chrome,segments=128)
    orient(orbit,right*normal[0]+up*normal[1]+toward*normal[2])
    for j,a in enumerate(([.4,3.6] if i==0 else [2.0,5.5])):
        sphere(f'Satellite_{i*2+j+1:02d}',.105 if j else .14,(2.10*math.cos(a),2.10*math.sin(a),0),black,orbit,32,16)
# Original monoline laser inscription, swept onto the outer band. These are
# our own line segments, not a redistributed font or a flat image/decal.
primary = bpy.data.objects['Ring_Primary']
local_view = primary.rotation_quaternion.inverted() @ toward
front_angle = math.atan2(local_view.y, local_view.x)
letters={
'I':[(.5,0,.5,1),(0,1,1,1),(0,0,1,0)],
'N':[(0,0,0,1),(0,1,1,0),(1,0,1,1)],
'K':[(0,0,0,1),(0,.5,1,1),(0,.5,1,0)],
'Z':[(0,1,1,1),(1,1,0,0),(0,0,1,0)],
'S':[(1,1,0,1),(0,1,0,.5),(0,.5,1,.5),(1,.5,1,0),(1,0,0,0)],
'L':[(0,1,0,0),(0,0,1,0)],
'A':[(0,0,.5,1),(.5,1,1,0),(.23,.45,.77,.45)],
'B':[(0,0,0,1),(0,1,.8,1),(.8,1,1,.75),(1,.75,.8,.5),(.8,.5,0,.5),(.8,.5,1,.25),(1,.25,.8,0),(.8,0,0,0)],
'E':[(0,0,0,1),(0,1,1,1),(0,.5,.8,.5),(0,0,1,0)],
'/':[(0,0,1,1)],
'0':[(0,0,0,1),(0,1,1,1),(1,1,1,0),(1,0,0,0)],
'1':[(.25,.8,.5,1),(.5,1,.5,0),(.1,0,.9,0)]}
vertices=[]; faces=[]; phrase='INKZ IS LABEL / 001'
for i,ch in enumerate(phrase):
    for x1,y1,x2,y2 in letters.get(ch,[]):
        x1=(i-(len(phrase)-1)/2)*.081+(x1-.5)*.055; x2=(i-(len(phrase)-1)/2)*.081+(x2-.5)*.055
        y1=(y1-.5)*.085-.035; y2=(y2-.5)*.085-.035
        dx,dy=x2-x1,y2-y1; length=math.hypot(dx,dy); nx,ny=-dy/length*.003,dx/length*.003
        corners=[(x1+nx,y1+ny),(x1-nx,y1-ny),(x2-nx,y2-ny),(x2+nx,y2+ny)]
        offset=len(vertices)
        for radius in (1.684,1.6845):
            for x,y in corners:
                theta=front_angle+x/1.62; vertices.append((radius*math.cos(theta),radius*math.sin(theta),y))
        faces.extend([tuple(offset+k for k in f) for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]])
mesh_object('Primary_Laser_Inscription',vertices,faces,recess,primary)
# Original, solid polygon INKZ inlay follows the reflective core surface.
# Single outlines avoid intersecting letter strokes and flickering overlaps.
vertices=[];faces=[]
glyphs=[(.055,[(0,0),(.055,0),(.055,.24),(0,.24)]),
(.205,[(0,0),(0,.24),(.055,.24),(.15,.08),(.15,.24),(.205,.24),(.205,0),(.15,0),(.055,.16),(.055,0)]),
(.215,[(0,0),(0,.24),(.055,.24),(.055,.145),(.14,.24),(.21,.24),(.105,.12),(.215,0),(.14,0),(.055,.095),(.055,0)]),
(.22,[(0,.24),(.22,.24),(.22,.195),(.075,.05),(.22,.05),(.22,0),(0,0),(0,.045),(.145,.19),(0,.19)])]
x_offset=-.39
for width,outline in glyphs:
    offset=len(vertices); count=len(outline)
    for radius in (.773,.782):
        for x,y in outline:
            x+=x_offset; y-=.085
            vertices.append(tuple(right*x+up*y+toward*math.sqrt(radius*radius-x*x-y*y)))
    faces.extend([tuple(offset+i for i in reversed(range(count))),tuple(offset+count+i for i in range(count))])
    for i in range(count): faces.append((offset+i,offset+(i+1)%count,offset+count+(i+1)%count,offset+count+i))
    x_offset+=width+.028
inlay=mesh_object('INKZ_Mark',vertices,faces,mark)
for polygon in inlay.data.polygons: polygon.use_smooth=False
# Studio is deliberately excluded from the GLB; realtime uses an offline PMREM
# of the same original softbox positions, with no runtime capture or bloom.
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'
scene.cycles.samples=int(os.environ.get('INKZ_RENDER_SAMPLES','192')); scene.cycles.use_denoising=False
scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=True
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.038,.045,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
STUDIO=[('Tall_Key',(-3,-4,4),1000,2.0,5.0,(1,.97,.94)),('Narrow_Rim',(4,1,3),1400,.8,4,(.9,.94,1)),('Top_Strip',(-1,1,5),1100,3,.65,(1,1,1)),('Front_Strip',(1,-5,1),180,.45,3,(1,1,1)),('Red_Bounce',(-2,-.5,-1),70,2,.18,(1,.002,.009)),('Inner_Red_Left',(-2,-3,0),20,.12,3,(1,.001,.006)),('Inner_Red_Right',(2,-1,-1),15,.12,2,(1,.001,.006))]
for name,location,energy,width,height,color in STUDIO:
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.color=color; data.shape='RECTANGLE'; data.size=width; data.size_y=height
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=location
    obj.rotation_euler=(-obj.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Poster_Camera'); camera=bpy.data.objects.new('Poster_Camera',camera_data); bpy.context.collection.objects.link(camera)
camera.location=camera_position; camera.rotation_euler=(-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type='ORTHO'; camera_data.ortho_scale=4.9; scene.camera=camera; scene.view_settings.view_transform='AgX'
bpy.ops.object.select_all(action='DESELECT'); root.select_set(True)
for obj in asset: obj.select_set(True)
bpy.context.view_layer.objects.active=core
path=ROOT/'public/models/inkz-rings.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/inkz-rings.blend'),compress=True)
blob=path.read_bytes(); length=struct.unpack_from('<I',blob,12)[0]; gltf=json.loads(blob[20:20+length]); triangles=0
for mesh in gltf['meshes']:
    for p in mesh['primitives']: triangles+=gltf['accessors'][p['indices']]['count']//3
report={'blender':bpy.app.version_string,'edition':'machined cylindrical hoops / quality overhaul','source':'assets/source/inkz-rings.blend','model':'public/models/inkz-rings.glb','triangles':triangles,'bytes':len(blob),'gzip_bytes':len(gzip.compress(blob,mtime=0)),'meshes':len(gltf['meshes']),'nodes':[n.get('name') for n in gltf['nodes']],'textures':len(gltf.get('textures',[])),'roughness_map':[512,128],'reference':'Approved primary THE RINGS image attached in the current task was visually inspected; named design/references files are still absent. Original modeled interpretation, not an exact reconstruction.'}
(ROOT/'assets/source/inkz-rings-report.json').write_text(json.dumps(report,indent=2)+'\n')
assert triangles<100000 and len(blob)<1500000, 'Asset budget exceeded: '+str(report)
scene.render.filepath=str(ROOT/'assets/source/inkz-rings-poster.png')
print('INKZ_ASSET_REPORT '+json.dumps(report),flush=True)
bpy.ops.render.render(write_still=True)
