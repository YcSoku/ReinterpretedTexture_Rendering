import { TBVSMarkers } from './../../geoscratch/function/tbvs';
import axios from 'axios';
import mapboxgl from "mapbox-gl";
import {Shader} from '../../geoscratch/core/shader/shader';
import { Matrix4x4 } from "../../geoscratch/core/math/matrix4";
import { encodeFloatToDouble } from "../../geoscratch/core/webglUtil/utils";


function degToRad(d: number): number {
    return d * Math.PI / 180;
}

class CustomLayer {
    id: string;
    type: string;
    renderingMode: string;

    constructor(id: string, type: string, renderingMode: string) {
        this.id = id;
        this.type = type;
        this.renderingMode = renderingMode;
    }
    

    onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext): void {
        console.log("custom layer on add");
    }

    render(gl: WebGL2RenderingContext, u_matrix: Array<number>): void {
        console.log("custom layer on render");
    }
}

class TBVSLayer extends CustomLayer {
    map: mapboxgl.Map | null;
    shader: Shader | null;
    texture: WebGLTexture | null;
    stripTexture: WebGLTexture | null;
    paletteTexture: WebGLTexture | null;

    framebuffer: Array<number>;
    pixelRatio: number;

    markerManager: TBVSMarkers;

    constructor(id: string, type: string, renderingMode: string, markerManager: TBVSMarkers) {
      super(id, type, renderingMode);
      this.map = null;
      this.shader = null;
      this.texture = null;
      this.stripTexture = null;
      this.paletteTexture = null;

      this.framebuffer = [];
      this.pixelRatio = window.devicePixelRatio;

      this.markerManager = markerManager;
    }

    async onAdd(map: mapboxgl.Map, gl: WebGL2RenderingContext) {
        this.map = map;
        this.framebuffer.push(gl.canvas.width);
        this.framebuffer.push(gl.canvas.height);

        this.markerManager.prepare(gl, 200000);

        // Get vertex shader source
        const vertexSource = await axios.get("http://localhost:8080/shaders/tbvs_newTest.vert")
        .then((response) => {
            return response.data;
        })
        // Get fragment shader source
        const fragmentSource = await axios.get("http://localhost:8080/shaders/tbvs.frag")
        .then((response) => {
            return response.data;
        })
        this.shader = new Shader(gl, vertexSource, fragmentSource);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
        gl.bindTexture(gl.TEXTURE_2D, null);

    }

    render(gl: WebGL2RenderingContext, matrix: Array<number>) {
        if (this.shader === null || this.map === null)
            return;

        // Update device memory
        this.markerManager.setDeviceMemory(gl, this.shader);

        // Compute necessary uniform variables
        const center = this.map.getCenter();
        const mercatorCenter = mapboxgl.MercatorCoordinate.fromLngLat({lng:center.lng, lat:center.lat});
        const mercatorCenterX = encodeFloatToDouble(mercatorCenter.x);
        const mercatorCenterY = encodeFloatToDouble(mercatorCenter.y);

        const relativeToEyeMatrix = matrix.slice();
        relativeToEyeMatrix[12] += relativeToEyeMatrix[0] * mercatorCenter.x + relativeToEyeMatrix[4] * mercatorCenter.y;
        relativeToEyeMatrix[13] += relativeToEyeMatrix[1] * mercatorCenter.x + relativeToEyeMatrix[5] * mercatorCenter.y;
        relativeToEyeMatrix[14] += relativeToEyeMatrix[2] * mercatorCenter.x + relativeToEyeMatrix[6] * mercatorCenter.y;
        relativeToEyeMatrix[15] += relativeToEyeMatrix[3] * mercatorCenter.x + relativeToEyeMatrix[7] * mercatorCenter.y;

        const symbolPixel = 25.0;
        const radius = 0.0;
        let modelMatrix = Matrix4x4.identity();
        modelMatrix = Matrix4x4.xRotate(modelMatrix, radius);
        modelMatrix = Matrix4x4.yRotate(modelMatrix, radius);
        modelMatrix = Matrix4x4.zRotate(modelMatrix, radius);
        modelMatrix = Matrix4x4.scale(modelMatrix, this.pixelRatio * symbolPixel, this.pixelRatio * symbolPixel, 1.0);
        modelMatrix = Matrix4x4.translate(modelMatrix, 0, 0, 0);

        // Change render stage
        this.shader.use(gl);
        this.markerManager.use(gl);

        this.shader.setInt(gl, "symbolTexture", 0);
        this.shader.setInt(gl, "paletteTexture", 1);
        this.shader.setFloat(gl, "blockSize", this.markerManager.instanceBlockSize);
        this.shader.setFloat2(gl, "u_mercatorCenterHigh", mercatorCenterX[0], mercatorCenterY[0]);
        this.shader.setFloat2(gl, "u_mercatorCenterLow", mercatorCenterX[1], mercatorCenterY[1]);
        this.shader.setFloat2(gl, "u_bufferSize", this.framebuffer[0], this.framebuffer[1]);
        this.shader.setMat4(gl, "u_matrix", relativeToEyeMatrix);
        this.shader.setMat4(gl, "u_symbolMatrix", modelMatrix);

        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 64, this.markerManager.getNumInstance() * this.markerManager.numMarkers); // verticesNum = blockSize + 2 (64 = 62 + 2)

        gl.bindVertexArray(null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
}

export{
    CustomLayer,
    TBVSLayer,
};