import axios from 'axios';
import { Shader } from "../core/shader/shader";
import {loadTexture} from "../../geoscratch/resource/data/texture"
import { encodeFloatToDouble } from "../../geoscratch/core/webglUtil/utils";
import * as THREE from 'three';



class tbvsSymbol {
    symbolID: number | string;
    rowIndexStart: number;
    rowIndexLength: number;
    position: Array<number>;

    constructor (symbolID: number | string, rowIndexStart: number, rowIndexLength: number, position: Array<number>) {
        this.symbolID = symbolID;
        this.rowIndexStart = rowIndexStart;
        this.rowIndexLength = rowIndexLength;
        this.position = position;
    }

    addRowindexToMemory(rowIndices: Array<number>): Array<number> {
        let i = 0;
        while (i < this.rowIndexLength) {
            rowIndices.push(this.rowIndexStart + i);

            i++;
        }

        return rowIndices;
    }

    addPosition2DToMemory(positions: Array<number>): Array<number> {
        let i = 0;
        while (i < this.rowIndexLength) {
            positions.push(this.position[0]);
            positions.push(this.position[1]);
            positions.push(this.position[2]);
            positions.push(this.position[3]);

            i++;
        }

        return positions;
    }

    addPosition3DToMemory(positions: Array<number>): Array<number> {
        let i = 0;
        while (i < this.rowIndexLength) {
            positions.push(this.position[0]);
            positions.push(this.position[1]);
            positions.push(this.position[2]);

            i++;
        }

        return positions;
    }
}

class tbvsSymbols {
    symbols: Array<tbvsSymbol>;
    rowIndices: Array<number>;
    positions: Array<number>;
    vao: WebGLVertexArrayObject | null;
    vbo_row: WebGLBuffer | null;
    vbo_pos: WebGLBuffer | null;


    constructor(symbols: Array<tbvsSymbol>, type="2D") {
        this.symbols = symbols;
        this.rowIndices = [];
        this.positions = [];

        this.vao = null;
        this.vbo_row = null;
        this.vbo_pos = null;

        if (type === "2D")
            this.make2DSymbolsMemory();
        else if (type === "3D")
            this.make3DSymbolsMemory();
    }

    make2DSymbolsMemory(): void {
        let i = 0;
        while (i < this.symbols.length) {
            this.rowIndices = this.symbols[i].addRowindexToMemory(this.rowIndices);
            this.positions = this.symbols[i].addPosition2DToMemory(this.positions);
    
            i++;
        }
    }

    make3DSymbolsMemory(): void {
        let i = 0;
        while (i < this.symbols.length) {
            this.rowIndices = this.symbols[i].addRowindexToMemory(this.rowIndices);
            this.positions = this.symbols[i].addPosition3DToMemory(this.positions);
    
            i++;
        }
    }

    setup(gl: WebGL2RenderingContext, shader: Shader): void {

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.vbo_row = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_row);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.rowIndices), gl.STATIC_DRAW);
        shader.setVertexBufferPointer_Instancing(gl, 0, 1, gl.FLOAT, false, 4 * 1, 0);

        this.vbo_pos = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_pos);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
        shader.setVertexBufferPointer_Instancing(gl, 1, 4, gl.FLOAT, false, 4 * 4, 0);

        gl.bindVertexArray(null);
    }

    Geometry4Three() {

        const posArray3 : Array<number> = [];
        for (let i = 0 ; i < this.positions.length * 3  / 2; ++i) {
            // if ( i % 4 === 3) posArray1.push(this.positions[i]);
            // posArray3.push(0.0);    
            // else posArray3.push(this.positions[i]);    
            // if ( i % 4 === 3) continue;
            posArray3.push(0.0);
        }

        const geom =  new THREE.InstancedBufferGeometry();
        const posAttrib = new THREE.InstancedBufferAttribute(new Float32Array(posArray3), 3, false, 1);
        const posExAttrib = new THREE.InstancedBufferAttribute(new Float32Array(this.positions), 4, false, 1);
        const rowAttrib = new THREE.InstancedBufferAttribute(new Float32Array(this.rowIndices), 1, false, 1);

        // geom.setAttribute('position', dummyAttrib);
        geom.setAttribute('position', posAttrib);
        geom.setAttribute('positionEx', posExAttrib);
        geom.setAttribute('blockIndex', rowAttrib);
        geom.setDrawRange(0, 63);
        geom.instanceCount = this.rowIndices.length;
        // geom.instanceCount =20;

        console.log(geom);
        return geom;
    }

    use(gl: WebGL2RenderingContext) {
        gl.bindVertexArray(this.vao);
    }

    getNumInstance() {
        return this.rowIndices.length;
    }

    isEmpty(): boolean {
        return !this.symbols.length;
    }
}

export type TextureDesc  = {
    name: string,
    width: number,
    height: number
}

export type MarkerStyleDesc = {
    ID: number,
    name: string,
    base: number,
    length: number
}

export type TBVSMarker = {
    ID: number,
    style: string,
    x: number,
    y: number,
    rot: number
}

export class TBVSMarkers {

    stripTextureDesc: TextureDesc;
    paletteTextureDesc: TextureDesc;
    name_style_map: Map<string, MarkerStyleDesc>;
    id_marker_map: Map<number, TBVSMarker>;

    numMarkers = 0;
    isDirty = false;

    instanceBlockSize = 62;
    maxNumInstance = 0;
    realNumInstance = 0;
    VAO: WebGLVertexArrayObject | null;
    VBO: WebGLBuffer | null;
    stripTexture: WebGLTexture | null;
    paletteTexture: WebGLTexture | null;


    constructor(jsonData: any) {
        this.stripTextureDesc = {
            name: jsonData.strip_texture.name,
            width: jsonData.strip_texture.width,
            height: jsonData.strip_texture.height
        };

        this.paletteTextureDesc = {
            name: jsonData.palette_texture.name,
            width: jsonData.palette_texture.width,
            height: jsonData.palette_texture.height
        };

        this.id_marker_map = new Map<number, TBVSMarker>();
        this.name_style_map = new Map<string, MarkerStyleDesc>();
        for (let index = 0; index < jsonData.markers.count; ++index) {
            if (!jsonData.markers.description[index]) continue;
            const newStyleDesc : MarkerStyleDesc = {
                ID: jsonData.markers.description[index].ID,
                name: jsonData.markers.description[index].name,
                base: jsonData.markers.description[index].base,
                length: jsonData.markers.description[index].length
            }

            this.name_style_map.set(newStyleDesc.name, newStyleDesc);
        }

        this.VAO = null;
        this.VBO = null;
        this.stripTexture = null;
        this.paletteTexture = null;
    }

    prepare(gl: WebGL2RenderingContext, maxNumInstance = 200000) {
        this.maxNumInstance = maxNumInstance;

        // set texture data
        this.stripTexture = loadTexture(gl, "http://localhost:8080/images/" + this.stripTextureDesc.name, 0);
        // this.paletteTexture = loadTexture(gl, "http://localhost:8080/images/" + this.paletteTextureDesc.name, 1);
        this.paletteTexture = loadTexture(gl, "http://localhost:8080/images/palette.png", 1);

        // assign device memory
        // MaxNumInstance:          200000
        // SampleInfoBuffer:        3.05MB = 4 float x MaxNumInstance (base, length, blockIndex, styleID)
        // GeoPositionBuffer:       3.05MB = 4 float x MaxNumInstance (posX_high, posY_high, posX_low, posY_low)
        this.VAO = gl.createVertexArray();
        gl.bindVertexArray(this.VAO);

        this.VBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        gl.bufferData(gl.ARRAY_BUFFER, maxNumInstance * 4 * 9, gl.DYNAMIC_DRAW);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    addMarker(posX: number, posY: number, rotation: number, styleName: string) {
        this.isDirty = true;

        const marker: TBVSMarker = {
            ID: this.numMarkers,
            style: styleName,
            x: posX,
            y: posY,
            rot: rotation
        }

        this.id_marker_map.set(this.numMarkers, marker);
        this.numMarkers++;
    }

    setDeviceMemory(gl: WebGL2RenderingContext, shader: Shader) {
        if (!this.isDirty) return;
        console.log("SET DEVICE MEMORY!");

        // create local buffer memory
        const sampleInfoBuffer: Array<number> = [];
        const geoPositionBuffer: Array<number> = [];
        const rotationBuffer: Array<number> = [];

        for (let i = 0; i < this.numMarkers; ++i) {
            const marker = this.id_marker_map.get(i);
            if (!marker) return;
            const style = this.name_style_map.get(marker.style);
            if (!style) return;

            this.realNumInstance = Math.ceil((style.length) / this.instanceBlockSize);
            // const multiInstance = (style.length > this.instanceBlockSize) ? 1 : 0;
            // this.realNumInstance =  1 + Math.ceil((style.length - 64) / (this.instanceBlockSize)) * multiInstance;

            for (let instance = 0; instance < this.realNumInstance; ++instance) {

                // set sample information
                sampleInfoBuffer.push(style.base);
                sampleInfoBuffer.push(style.length);
                sampleInfoBuffer.push(instance);
                sampleInfoBuffer.push(style.ID);

                // set geo position
                const positionX = encodeFloatToDouble(marker.x);
                const positionY = encodeFloatToDouble(marker.y);
    
                geoPositionBuffer.push(positionX[0]);
                geoPositionBuffer.push(positionY[0]);
                geoPositionBuffer.push(positionX[1]);
                geoPositionBuffer.push(positionY[1]);

                // set rotation
                const rotation = marker.rot;
                rotationBuffer.push(rotation);
            }
        }

        // map to device memory
        gl.bindVertexArray(this.VAO);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO);
        
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(sampleInfoBuffer));
        gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 4 * this.maxNumInstance, new Float32Array(geoPositionBuffer));
        gl.bufferSubData(gl.ARRAY_BUFFER, 4 * 8 * this.maxNumInstance, new Float32Array(rotationBuffer));

        shader.setVertexBufferPointer_Instancing(gl, 0, 4, gl.FLOAT, false, 4 * 4, 0, 1);
        shader.setVertexBufferPointer_Instancing(gl, 1, 4, gl.FLOAT, false, 4 * 4, 4 * 4 * this.maxNumInstance, 1)
        shader.setVertexBufferPointer_Instancing(gl, 2, 1, gl.FLOAT, false, 4 * 1, 4 * 8 * this.maxNumInstance, 1)
        
        gl.bindVertexArray(null);

        this.isDirty = false;
    }

    use(gl: WebGL2RenderingContext) {

        gl.bindVertexArray(this.VAO);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.stripTexture);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.paletteTexture);
    }

    getNumInstance() {
        return this.realNumInstance;
    }

    setBlockSize(size: number) {
        if (size < 0) {
            console.log("ERROR_TBVSMARKERS_INSTANCEBLOCKSIZE_INVALID_NUMBER");
            return;
        }
        this.instanceBlockSize = size;
        this.isDirty = true;
    }

    static async parseDescription(descriptionURL: string) {
        const jsonData = await axios.get("http://localhost:8080/json/tbvs.json")
        .then((response) => {
            return response.data
        })

        return new TBVSMarkers(jsonData);

    }
}

export {
    tbvsSymbol,
    tbvsSymbols
};