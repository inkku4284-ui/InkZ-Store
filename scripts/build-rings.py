"""Original INKZ THE RINGS / FORM 001. Blender 4.3+, deterministic local geometry.
Run: blender --background --threads 4 --python scripts/build-rings.py
No external model, texture, font or concept-image plane is used.
"""
import bpy, bmesh, math, json, os, gzip, struct
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials): bpy.data.materials.remove(block)

def material(name, color, metal, rough, emission=0):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Metallic'].default_value=metal; shader.inputs['Roughness'].default_value=rough
    if emission:
        shader.inputs['Emission Color'].default_value=(*color,1); shader.inputs['Emission Strength'].default_value=emission
    return mat
black=material('Black_Chrome',(0.023,0.025,0.03),1,.16)
chrome=material('Brushed_Chrome',(0.53,0.55,0.58),1,.23)
polished=material('Polished_Edge',(0.72,0.74,0.77),1,.13)
dark=material('Recessed_Graphite',(0.014,0.015,0.018),.8,.31)
red=material('Deep_Red_Inlay',(0.47,0.012,0.027),.65,.25)
light=material('Red_Channel',(0.55,0.008,0.019),.45,.25,1.4)
mark=material('Bone_Mark',(0.83,0.81,0.76),.5,.26)
root=bpy.data.objects.new('THE_RINGS_FORM_001',None); bpy.context.collection.objects.link(root)
asset=[]
def prepare(obj,name,mat,parent=root,bevel=0):
    obj.name=name; obj.data.materials.append(mat); obj.parent=parent
    if bevel:
        mod=obj.modifiers.new('Machined_edges','BEVEL'); mod.width=bevel; mod.segments=2
        mod=obj.modifiers.new('Weighted_normals','WEIGHTED_NORMAL'); mod.keep_sharp=True
    for polygon in obj.data.polygons: polygon.use_smooth=True
    asset.append(obj); return obj

def sphere(name,radius,position,mat,parent=root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=radius,location=position)
    return prepare(bpy.context.object,name,mat,parent)

def band(name,radius,width,depth,mat,rotation,parent=root,arc=math.tau):
    steps=128 if arc==math.tau else max(16,int(128*arc/math.tau))
    closed=arc==math.tau; count=steps if closed else steps+1
    vertices=[]; faces=[]
    for i in range(count):
        a=i/steps*arc
        for r,z in [(radius-width/2,-depth/2),(radius+width/2,-depth/2),(radius+width/2,depth/2),(radius-width/2,depth/2)]:
            vertices.append((r*math.cos(a),r*math.sin(a),z))
    for i in range(steps):
        j=(i+1)%count
        for f in range(4): faces.append((i*4+f,i*4+(f+1)%4,j*4+(f+1)%4,j*4+f))
    if not closed: faces.extend([(0,3,2,1),tuple((count-1)*4+j for j in [0,1,2,3])])
    mesh=bpy.data.meshes.new(name+'_mesh'); mesh.from_pydata(vertices,[],faces); mesh.update()
    bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free(); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    prepare(obj,name,mat,parent,min(depth*.23,.009)); obj.rotation_euler=rotation
    return obj

core=sphere('INKZ_Core',.77,(0,0,0),black)
primary=band('Ring_Primary',1.52,.24,.06,chrome,(1.1,-.26,-.48))
secondary=band('Ring_Secondary',1.28,.14,.055,polished,(.26,1.07,.44))
tertiary=band('Ring_Tertiary',1.67,.18,.05,chrome,(.79,-.92,1.2))
# Child geometry uses local coordinates; each ring pivot remains at the core.
band('Primary_Edge',1.415,.016,.064,polished,(0,0,0),primary)
band('Secondary_Edge',1.36,.012,.04,dark,(0,0,0),secondary)
a=band('Accent_Light_A',1.525,.032,.066,light,(0,0,.3),primary,math.pi*.74)
b=band('Accent_Light_B',1.674,.018,.055,red,(0,0,-1.35),tertiary,math.pi*.62)
band('Orbit_Filament',1.87,.016,.024,polished,(.45,.12,-.2),secondary)
# Small deliberately sparse fasteners; never a field of decorative particles.
for ring_index,ring in enumerate([primary,tertiary]):
    r=1.52 if ring_index==0 else 1.67
    for index in range(8):
        angle=index*math.tau/8
        bpy.ops.mesh.primitive_cube_add(size=1)
        bolt=bpy.context.object; bolt.location=(r*math.cos(angle),r*math.sin(angle),.042)
        bolt.dimensions=(.04,.065,.018); bolt.rotation_euler.z=angle
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        prepare(bolt,f'Ring_{ring_index}_Fastener_{index:02d}',dark,ring,.004)
for i,(pos,radius) in enumerate([((1.53,-.7,.92),.13),((-1.5,.4,-.7),.11),((.65,1.4,1.05),.15)]):
    sphere(f'Satellite_{i+1:02d}',radius,pos,black)
# Original geometric I N K Z mark, raised on a local tangent to the front core.
def stroke(name,x1,z1,x2,z2):
    length=math.hypot(x2-x1,z2-z1)
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj=bpy.context.object; obj.dimensions=(.018,.008,length+.014)
    obj.location=((x1+x2)/2,-.775,(z1+z2)/2)
    obj.rotation_euler.y=math.atan2(x2-x1,z2-z1)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return prepare(obj,name,mark,root,.001)
segments=[(-.25,-.08,-.25,.09),(-.17,-.08,-.17,.09),(-.17,.09,-.07,-.08),(-.07,-.08,-.07,.09),(.02,-.08,.02,.09),(.02,0,.12,.09),(.02,0,.12,-.08),(.18,.09,.3,.09),(.3,.09,.18,-.08),(.18,-.08,.3,-.08)]
for i,segment in enumerate(segments): stroke(f'INKZ_Mark_{i:02d}',*segment)
# Merge same-material static details by parent to reduce draw calls, preserving ring pivots.
def join_details(prefix,name):
    objects=[obj for obj in asset if obj.name.startswith(prefix)]
    remaining=[obj for obj in asset if obj not in objects]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    joined=bpy.context.object; joined.name=name
    asset[:]=remaining+[joined]
join_details('INKZ_Mark_','INKZ_Mark')
join_details('Ring_0_Fastener_','Primary_Fasteners')
join_details('Ring_1_Fastener_','Tertiary_Fasteners')
# Render rig is deliberately excluded from the GLB selection.
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.device='CPU'; scene.cycles.samples=192
scene.cycles.use_denoising=False  # This Blender build has no OpenImageDenoise; render real samples instead.
scene.render.resolution_x=1000; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=True
scene.world.color=(.04,.04,.04)
world=scene.world; world.use_nodes=True; world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.12,.14,1); world.node_tree.nodes['Background'].inputs[1].default_value=.18

def area(name,loc,energy,size,color=(1,1,1),size_y=None):
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.color=color
    data.shape='RECTANGLE'; data.size=size; data.size_y=size_y or size
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); obj.location=loc
    obj.rotation_euler=(Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Studio_Key',(-3,-4,5),900,4,(1,.96,.91),2)
area('Studio_Rim',(3,1,3),1300,3,(.85,.9,1),1)
area('Studio_Fill',(1,-5,.5),450,2,(1,1,1),4)
area('Low_Red',(-2,1,-1),40,2,(.6,.025,.04),1)
camera_data=bpy.data.cameras.new('Poster_Camera'); camera=bpy.data.objects.new('Poster_Camera',camera_data); bpy.context.collection.objects.link(camera)
camera.location=(3.4,-7,2.5); camera.rotation_euler=(Vector((0,0,0))-camera.location).to_track_quat('-Z','Y').to_euler(); camera_data.type='ORTHO'; camera_data.ortho_scale=4.7; scene.camera=camera
scene.view_settings.view_transform='AgX'
# Export only local, authored geometry. No decoder or external texture is needed.
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for obj in asset: obj.select_set(True)
bpy.context.view_layer.objects.active=core
model_path=ROOT/'public/models/inkz-rings.glb'
bpy.ops.export_scene.gltf(filepath=str(model_path),export_format='GLB',use_selection=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/source/inkz-rings.blend'),compress=True)
# Inspect the actual GLB, not estimates from the pre-export Blender scene.
blob=model_path.read_bytes(); length,kind=struct.unpack_from('<II',blob,12); gltf=json.loads(blob[20:20+length])
triangles=0
for mesh in gltf.get('meshes',[]):
    for prim in mesh['primitives']:
        triangles+=gltf['accessors'][prim['indices']]['count']//3 if 'indices' in prim else gltf['accessors'][prim['attributes']['POSITION']]['count']//3
report={'blender':bpy.app.version_string,'source':'assets/source/inkz-rings.blend','model':'public/models/inkz-rings.glb','triangles':triangles,'bytes':len(blob),'gzip_bytes':len(gzip.compress(blob,mtime=0)),'meshes':len(gltf.get('meshes',[])),'nodes':[node.get('name') for node in gltf.get('nodes',[])],'textures':len(gltf.get('textures',[])),'reference_limitation':'design/references/inkz-rings-main.png and the reference directory are missing; original geometry interprets the written brief and the attached composite, not an exact image reconstruction.'}
(ROOT/'assets/source/inkz-rings-report.json').write_text(json.dumps(report,indent=2)+'\n')
assert triangles<100000 and len(blob)<1500000, 'Asset budget exceeded'
scene.render.filepath=str(ROOT/'assets/source/inkz-rings-poster.png')
bpy.ops.render.render(write_still=True)
print('INKZ_ASSET_REPORT '+json.dumps(report))
