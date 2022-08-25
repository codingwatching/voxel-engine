#version 430 core

in vec2 ndc;
out vec4 fragColor;

#define PI 3.1415926538;

uniform vec2 resolution;
uniform float iTime;

uniform bool canvasAABBcheck;
uniform bool normalAsAlbedo;
uniform bool visualizeSteps;
uniform float sdfNormalPrecision;
uniform int voxelTraceSteps;

uniform vec3 camPos;
uniform mat4 view;

uniform sampler3D data;
uniform vec3 dataSize;

float Sample(vec3 pos)
{
    float value = texture(data, pos / dataSize).r;
    return value;
}

vec3 intersectAABB(vec3 eye, vec3 dir, vec3 pos, vec3 size)
{
    float t1 = (pos.x - eye.x) / dir.x;
    float t2 = (pos.x + size.x - eye.x) / dir.x;
    float t3 = (pos.y - eye.y) / dir.y;
    float t4 = (pos.y + size.y - eye.y) / dir.y;
    float t5 = (pos.z - eye.z) / dir.z;
    float t6 = (pos.z + size.z - eye.z) / dir.z;
    float aMin = t1 < t2 ? t1 : t2;
    float bMin = t3 < t4 ? t3 : t4;
    float cMin = t5 < t6 ? t5 : t6;
    float aMax = t1 > t2 ? t1 : t2;
    float bMax = t3 > t4 ? t3 : t4;
    float cMax = t5 > t6 ? t5 : t6;
    float fMax = aMin > bMin ? aMin : bMin;
    float fMin = aMax < bMax ? aMax : bMax;
    float t7 = fMax > cMin ? fMax : cMin;
    float t8 = fMin < cMax ? fMin : cMax;
    float t9 = (t8 < 0 || t7 > t8) ? -1 : t7;
    float t = t9;

    if (t > 0 && t < 9999) return eye + t * dir;
    else return eye;
}

// check if a coord is within the voxel data or not
bool isCoordOutsideCanvas(vec3 coord)
{
    if (coord.x < -1 || coord.x > dataSize.x + 1 || coord.y < -1 || coord.y > dataSize.y + 1 || coord.z < -1 || coord.z > dataSize.z + 1) return true;
    else return false;
}

vec3 VoxelTrace(vec3 eye, vec3 marchingDirection, out int stepsTraced)
{
    vec3 origin = eye;
    vec3 direction = marchingDirection;
    vec3 tdelta;
    float tx, ty, tz;

    // initialize t
    if (direction.x < 0)
    {
        tdelta.x = -1 / direction.x;
        tx = (floor(origin.x / 1) * 1 - origin.x) / direction.x;
    }
    else 
    {
        tdelta.x = 1 / direction.x;
        tx = ((floor(origin.x / 1) + 1) * 1 - origin.x) / direction.x;
    }
    if (direction.y < 0) 
    {
        tdelta.y = -1 / direction.y;
        ty = (floor(origin.y / 1) * 1 - origin.y) / direction.y;
    }
    else 
    {
        tdelta.y = 1 / direction.y;
        ty = ((floor(origin.y / 1) + 1) * 1 - origin.y) / direction.y;
    }
    if (direction.z < 0)
    {
        tdelta.z = -1 / direction.z;
        tz = (floor(origin.z / 1) * 1 - origin.z) / direction.z;
    }
    else
    {
        tdelta.z = 1 / direction.z;
        tz = ((floor(origin.z / 1) + 1) * 1 - origin.z) / direction.z;
    }

    // initializing some variables
    float t = 0;
    int steps = 0;
    vec3 coord = floor(origin);
    vec3 result;

    // tracing the grid
    while (true)
    {
        // if voxel is found
        if (Sample(coord) > 0)
        {
            result = coord;
            stepsTraced = steps;
            break;
        }

        // increment step
        if (tx < ty)
        {
            if (tx < tz)
            {
                t = tx;
                tx += tdelta.x;
                if (direction.x < 0) coord.x -= 1;
                else coord.x += 1;
            }
            else
            {
                t = tz;
                tz += tdelta.z;
                if (direction.z < 0) coord.z -= 1;
                else coord.z += 1;
            }
        }
        else
        {
            if (ty < tz)
            {
                t = ty;
                ty += tdelta.y;
                if (direction.y < 0) coord.y -= 1;
                else coord.y += 1;
            }
            else
            {
                t = tz;
                tz += tdelta.z;
                if (direction.z < 0) coord.z -= 1;
                else coord.z += 1;
            }
        }

        steps++;

        // if no voxel was hit or coord is outside the canvas
        if (steps > voxelTraceSteps || (canvasAABBcheck && isCoordOutsideCanvas(coord)))
        {
            result = vec3(0);
            stepsTraced = steps;
            break;
        }
    }

    return result;
}

vec3 VoxelNormal(vec3 coord)
{
    vec3 normal = vec3(0, 0, 0);
    int samplesize = 5;
    float t = samplesize / 2;
    
    for (int x = 0; x < samplesize; x++)
    {
        for (int y = 0; y < samplesize; y++)
        {
            for (int z = 0; z < samplesize; z++)
            {
                float a = x - t;
                float b = y - t;
                float c = z - t;
                if (Sample(vec3(coord.x + a, coord.y + b, coord.z + c)) > 0) 
                {
                    normal += vec3(a, b, c);
                }
            }
        }
    }

    return -normalize(normal);
}

vec3 hsv2rgb(vec3 c) 
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main()
{
    // define bg color
    vec4 bgc = vec4(0.2, 0.2, 0.2, 1.0);

    // calc uv from ndc
    vec2 uv = ndc * normalize(resolution);

    // camera
    vec3 eye = camPos;
    vec3 dir = (view * vec4(uv * 1, 1, 1)).xyz;

    // offset eye to canvas aabb if possible
    if (canvasAABBcheck) eye = intersectAABB(eye, dir, vec3(0), dataSize);

    // if ray never crossed the canvas aabb, return bg color
    if (isCoordOutsideCanvas(eye) && canvasAABBcheck)
    {
        fragColor = bgc;
		return;
    }

    // define variables
    vec3 VoxelCoord;
    vec3 normal;

    // trace ray
    int steps;
    VoxelCoord = VoxelTrace(eye, dir, steps);
    float top = voxelTraceSteps;
    float stepvisual = steps / top;

    // step visualization for debugging
    if (visualizeSteps)
    {
        fragColor = vec4(bgc.x + stepvisual, bgc.y, bgc.z, 1);
        return;
    }

    // sample hue
    vec3 albedo = hsv2rgb(vec3(Sample(VoxelCoord), 1, 1));

    // calc normals
    normal = VoxelNormal(VoxelCoord);

    // calc light pos
    vec3 lightdir = vec3(1, 0.6, 1);
    vec3 lightpos = normalize(lightdir * 10000);

    // calc diffuse
    float diffuse = max(0.3, dot(lightpos, normal));

    // calc specular
    vec3 specularcolor = vec3(0.3, 0.3, 0.3);
    vec3 specular = pow(clamp(dot(lightpos, normal), 0.0, 1.0), 64.0) * specularcolor;
    
    // if nothing was hit
    if (VoxelCoord == vec3(0, 0, 0))
    {
        fragColor = bgc;
		return;
    }

    // normal as albedo for debugging
    if (normalAsAlbedo) albedo = (normal * 0.5 + 0.5);
    
    // return result
    fragColor = vec4((albedo * diffuse) + specular, 1.0);
}