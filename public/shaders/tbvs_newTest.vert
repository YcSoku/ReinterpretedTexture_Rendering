#version 300 es

layout(location=0) in vec4 sampleInfo;      // (base, length, blockIndex, styleID)
layout(location=1) in vec4 geoPosition;
layout(location=2) in float rotation;

uniform sampler2D symbolTexture;
uniform sampler2D paletteTexture;

uniform mat4 u_matrix;
uniform mat4 u_symbolMatrix;

uniform vec2 u_mercatorCenterHigh;
uniform vec2 u_mercatorCenterLow;
uniform float blockSize;
uniform vec2 u_bufferSize;

out vec3 fragColor;

vec2 translateRelativeToEye(vec2 high, vec2 low)
{
    vec2 highDiff = high - u_mercatorCenterHigh;
    vec2 lowDiff = low - u_mercatorCenterLow;

    return highDiff + lowDiff;
}

mat4 matRotZ(float rad) 
{
   return transpose(mat4(
        vec4(cos(rad), -sin(rad), 0, 0), 
        vec4(sin(rad), cos(rad), 0, 0), 
        vec4(0, 0, 1, 0), 
        vec4(0, 0, 0, 1)
    )); 
}

vec3 palette[2] = vec3[](
    vec3(0.0, 0.0, 0.0),
    vec3(1.0, 0.0, 0.0)
);

void main() {

    float symbolTextureWidth = float(textureSize(symbolTexture, 0).x);
    float isBegin = step(1.0, sampleInfo.z);
    float sampleIndex = sampleInfo.x + clamp(sampleInfo.z * blockSize + float(gl_VertexID) - 2.0, 0.0, sampleInfo.y - 1.0);

    float offset = sampleInfo.x + sampleInfo.z * blockSize;
    float index = clamp(offset + float(gl_VertexID), 0.0, sampleInfo.x + sampleInfo.y - 1.0);

    int u = int(mod(index, symbolTextureWidth));
    int v = int(floor(index / symbolTextureWidth));

    vec4 posColor = texelFetch(symbolTexture, ivec2(u, v), 0);

    int intR = int(posColor.r * 255.0);
    int intG = int(posColor.g * 255.0);

    float fractX = float(intR & 252) / 255.0;
    float fractY = float(intG & 252) / 255.0;
    float intX = posColor.b * 255.0;
    float intY = posColor.a * 255.0;

    float x = ((fractX + intX) / 255.0) * 2.0 - 1.0;
    float y = ((fractY + intY) / 255.0) * 2.0 - 1.0;

    vec4 symbolOffset_ss = matRotZ(rotation) * u_symbolMatrix * vec4(x, -y, 0.0, 1.0);
    vec4 geoPos_cs = u_matrix * vec4(translateRelativeToEye(geoPosition.xy, geoPosition.zw), 0.0, 1.0);

    gl_Position = vec4(geoPos_cs.xy + symbolOffset_ss.xy * geoPos_cs.w / u_bufferSize, geoPos_cs.zw);

    int colorIndex = ((intR & 3) << 2) + (intG & 3);
    fragColor = texelFetch(paletteTexture, ivec2(colorIndex, int(sampleInfo.w)), 0).rgb;
    // fragColor = vec3(197.0, 90.0, 17.0) / 255.0;
}