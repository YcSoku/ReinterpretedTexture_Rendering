# ReinterpretedTexture_Prototype

## Introduction
This is a web prototype system about a vector point symbol rendering method based on the texture structure. The rendering context is WebGL2, and the base map is presented by Mapbox GL js.

A texel in the texture is a piece of vertex information in the size of 4 Bytes. It contains a pair of coordinates and a color index of one of the vertex of a vector point symbol (organized by one triangle strip). GPU Instancing is used to launch the rendering pipeline. All different symbols can be rendered in one draw call by specifying their layout information about where they lie in the texture. With the help of the built-in variable gl_VertexID and textures' random access feature, vertices can be decoded from the symbol texture. 

By using thie method, both the quality of the vector style and the performance of the raster style can be taken to improve the point symbol drawing on maps.

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```
## Note 
The prototype system will use port 8080 by default, please make sure that this port is not occupied during the trial.
