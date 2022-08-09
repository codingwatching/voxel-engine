#version 430 core

in vec2 ndc;
out vec4 fragColor;

#define PI 3.1415926538;

uniform vec2 resolution;
uniform float iTime;

uniform bool normalAsAlbedo;
uniform float sdfNormalPrecision;
uniform int voxelTraceSteps;
uniform int scale;

uniform vec3 camPos;
uniform mat4 view;

uniform sampler3D data;

float sphereSDF(vec3 pos, float scale)
{
    return length(pos) - scale;
}

float mandelbulbSDF(vec3 pos, float scale) 
{
    pos /= scale;

    float power = 8;
	vec3 z = pos;
	float dr = 1.0;
	float r = 0.0;

	for (int i = 0; i < 7; i++)
	{
		r = length(z);
		if (r > 2.0) break;
		
		// convert to polar coordinates
		float theta = acos(z.z / r);
		float phi = atan(z.y, z.x);

		dr = pow(r, power - 1.0) * power * dr + 1.0;
		
		// scale and rotate the point
		float zr = pow(r, power);
		theta = theta * power;
		phi = phi * power;
		
		// convert back to cartesian coordinates
		z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        
        z += pos;
	}
	return 0.5 * log(r) * r / dr;
}

float mandelbrot3dSDF(vec3 pos, float scale) 
{
    pos /= scale;

    float power = 2;
	vec3 z = pos;
	float dr = 1.0;
	float r = 0.0;

	for (int i = 0; i < 7; i++)
	{
		r = length(z);
		if (r > 2.0) break;
		
		// convert to polar coordinates
        float theta = asin(z.z / r);
        float phi = atan(z.y, z.x);

		dr = pow(r, power - 1.0) * power * dr + 1.0;
		
		// scale and rotate the point
		float zr = pow(r, power);
		theta = theta * power;
		phi = phi * power;
		
		// convert back to cartesian coordinates
		z = zr * vec3(cos(theta) * cos(phi), cos(theta) * sin(phi), sin(theta));
        
        z += pos;
	}
	return 0.5 * log(r) * r / dr;
}


float Sample(vec3 pos)
{
    float value = texture(data, pos / scale).r;
    return value;
}

vec3 VoxelTrace(vec3 eye, vec3 marchingDirection)
{
    vec3 rayOrigin = eye;
    vec3 rayDirection = marchingDirection;
    vec3 cellDimension = vec3(1, 1, 1);
    vec3 voxelcoord;
    vec3 deltaT, nextCrossingT;
    float t_x, t_y, t_z;

    // initializing values
    if (rayDirection[0] < 0)
    {
        deltaT[0] = -cellDimension[0] / rayDirection[0];
        t_x = (floor(rayOrigin[0] / cellDimension[0]) * cellDimension[0]- rayOrigin[0]) / rayDirection[0];
    }
    else 
    {
        deltaT[0] = cellDimension[0] / rayDirection[0];
        t_x = ((floor(rayOrigin[0] / cellDimension[0]) + 1) * cellDimension[0] - rayOrigin[0]) / rayDirection[0];
    }
    if (rayDirection[1] < 0) 
    {
        deltaT[1] = -cellDimension[1] / rayDirection[1];
        t_y = (floor(rayOrigin[1] / cellDimension[1]) * cellDimension[1] - rayOrigin[1]) / rayDirection[1];
    }
    else 
    {
        deltaT[1] = cellDimension[1] / rayDirection[1];
        t_y = ((floor(rayOrigin[1] / cellDimension[1]) + 1) * cellDimension[1] - rayOrigin[1]) / rayDirection[1];
    }
    if (rayDirection[2] < 0)
    {
        deltaT[2] = -cellDimension[2] / rayDirection[2];
        t_z = (floor(rayOrigin[2] / cellDimension[2]) * cellDimension[2] - rayOrigin[2]) / rayDirection[2];
    }
    else
    {
        deltaT[2] = cellDimension[2] / rayDirection[2];
        t_z = ((floor(rayOrigin[2] / cellDimension[2]) + 1) * cellDimension[2] - rayOrigin[2]) / rayDirection[2];
    }

    // initializing some variables
    float t = 0;
    float stepsTraced = 0;
    vec3 cellIndex = floor(rayOrigin);

    // tracing the grid
    while (true)
    {
        // if voxel is found
        if (Sample(cellIndex) > 0)
        {
            voxelcoord = cellIndex;
            break;
        }

        // increment step
        if (t_x < t_y)
        {
            if (t_x < t_z)
            {
                t = t_x;
                t_x += deltaT[0];
                if (rayDirection[0] < 0) cellIndex[0] -= 1;
                else cellIndex[0] += 1;
            }
            else
            {
                t = t_z;
                t_z += deltaT[2];
                if (rayDirection[2] < 0) cellIndex[2] -= 1;
                else cellIndex[2] += 1;
            }
        }
        else
        {
            if (t_y < t_z)
            {
                t = t_y;
                t_y += deltaT[1];
                if (rayDirection[1] < 0) cellIndex[1] -= 1;
                else cellIndex[1] += 1;
            }
            else
            {
                t = t_z;
                t_z += deltaT[2];
                if (rayDirection[2] < 0) cellIndex[2] -= 1;
                else cellIndex[2] += 1;
            }
        }

        stepsTraced++;

        // if no voxel was hit
        if (stepsTraced > voxelTraceSteps)
        {
            voxelcoord = vec3(0, 0, 0);
            break;
        }
    }

    return voxelcoord;
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

void main()
{
    // calc uv from ndc
    vec2 uv = ndc * normalize(resolution);

    // hardcoded crosshair
    if (distance(uv, vec2(0, 0)) < 0.01)
    {
        fragColor = vec4(1, 1, 1, 1);
        return;
    }

    // camera
    vec3 eye = camPos;
    vec3 dir = (view * vec4(uv * 1, 1, 1)).xyz;

    // define variables
    vec3 VoxelCoord;
    vec3 normal;
    vec3 albedo = vec3(0.5, 0.5, 1);

    // trace rays
    VoxelCoord = VoxelTrace(eye, dir);

    // calc normals
    normal = VoxelNormal(VoxelCoord);

    // calc diffuse
    vec3 lightPos = vec3(4000, 4000, 4000);
    float diffuse = max(0.3, dot(normalize(lightPos), normal));
    
    // if nothing was hit
    if (VoxelCoord == vec3(0, 0, 0))
    {
        fragColor = vec4(0.2, 0.2, 0.2, 1.0);
		return;
    }

    if (normalAsAlbedo) albedo = (normal * 0.5 + 0.5);
    
    // return result
    fragColor = vec4(albedo * diffuse, 1.0);
}