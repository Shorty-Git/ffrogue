"""Source-checked corner RGBA values for legacy IBMB quad nodes."""
import math
import struct

CORNER_OFFSETS={'leftTop':104,'rightTop':136,'leftBottom':168,'rightBottom':200}
SOURCE_NAMES={'leftTop':'LeftTop','rightTop':'RightTop','leftBottom':'LeftBottom','rightBottom':'RightBottom'}


def rgba(data, offset):
    values=list(struct.unpack_from('<4f',data,offset))
    if not all(math.isfinite(v)for v in values):
        raise ValueError('Non-finite quad color')
    return values


def attach_quad_colors(raw, result):
    for node in result['nodes']:
        if node['typeId']!=2:
            continue
        offset=node['offset']
        flat=raw[offset+320]
        if flat not in [0,1]:raise ValueError('Unknown quad flat-color flag')
        code=struct.unpack_from('<I',raw,offset+1720)[0]
        node['quadColors']={'flat':bool(flat),'modeId':code,'mode':{0:'Constant',1:'Curve'}.get(code,'Unknown'),
            'corners':{name:{'value':rgba(raw,offset+relative),'range':rgba(raw,offset+relative+16),
                             'fieldOffset':offset+relative}for name,relative in CORNER_OFFSETS.items()}}


def compare_quad_colors(node, source):
    colors=node['quadColors']
    if colors['flat']!=(source.findtext('Color_Basic_Flat')=='true'):
        raise ValueError('Quad flat-color source mismatch')
    if colors['mode']!=source.findtext('Color_Basic_ColorType'):
        raise ValueError('Quad color mode source mismatch')
    for corner,fields in colors['corners'].items():
        for name,term in [('value','Value'),('range','Range')]:
            element=source.find('Color_Vertex'+SOURCE_NAMES[corner]+'_'+term)
            expected=[float(element.attrib[a])for a in 'RGBA']
            if struct.pack('<4f',*fields[name])!=struct.pack('<4f',*expected):
                raise ValueError('Quad corner RGBA source mismatch')
    return {'cornersChecked':4,'rgbaVectorsChecked':8,'flatFlagChecked':True,'colorModeChecked':True}
