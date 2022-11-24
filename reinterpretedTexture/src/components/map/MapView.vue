<template>

<link href='https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.css' rel='stylesheet' />
<div id="map"></div>
<div id="stats"></div>

</template>

<script lang="ts">

import axios from 'axios';
import mapboxgl, { Map} from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getMap } from './toolset/mapSetting';
import Stats from 'three/examples/jsm/libs/stats.module';

import {TBVSMarkers} from "../geoscratch/function/tbvs";
import { onMounted } from '@vue/runtime-dom';
import { TBVSLayer } from "./toolset/customLayer"
import { DEG2RAD } from '../geoscratch/core/math/utils';

let map: Map;
let container: HTMLElement | null;
let stats: Stats;

export default {
    name: 'MapView',

    setup() {
        onMounted(async () => {
            container = document.getElementById( 'stats' ); 
            stats = new (Stats as any)();
            container?.appendChild( stats.dom );

            map = getMap('pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg', 
            {
                container: 'map', // container ID
                style: 'mapbox://styles/ycsoku/cl9gh50m2003114qtcs77i7gc', // style URL
                center: [118.800697,32.064162], // starting position [lng, lat]
                zoom: 4, // starting zoom
                antialias: true,
                // projection: 'mercator'
            });

            // create tbvsMarkers
            let markerManager : (TBVSMarkers | null) = null;
            markerManager = await TBVSMarkers.parseDescription("http://localhost:8080/json/tbvs.json");

            const isSideWalk = true;
            if (isSideWalk) {

                await axios.get("http://localhost:8080/json/crossroad_NJ.geojson")
                .then(function(response) {

                    for(let i = 0; i < response.data.features.length; i++) {
                        const coordinates = response.data.features[i].geometry.coordinates;
                        const position = mapboxgl.MercatorCoordinate.fromLngLat({lng:Math.fround(coordinates[0]), lat:Math.fround(coordinates[1])});

                        markerManager!.addMarker(position.x, position.y, 0, "sidewalk_kai");
                    }
                });
            } else {
                await axios.get("http://localhost:8080/json/airline_20221019.json")
                .then(function(response) {

                    for (let key in response.data) {
                        if (key === "full_count" || key == "version" || key == "stats" ) {
                            continue;
                        }
                        const airlineInfo = response.data[key];
                        const lat = airlineInfo[1];
                        const lon = airlineInfo[2];
                        const rot = airlineInfo[3];

                        const position = mapboxgl.MercatorCoordinate.fromLngLat({lng:Math.fround(lon), lat:Math.fround(lat)});
                        markerManager!.addMarker(position.x, position.y, rot * DEG2RAD, "transport_airport");

                    }
                });
            }

            let layer = new TBVSLayer("tbvs", "custom", "3d", markerManager);

            map.on('load', ()=> {
                map.addLayer(layer as mapboxgl.CustomLayerInterface, 'country-label');
            });

            map.on('render', ()=> {
                stats.update();
            });
        });
    }
}
</script>

<style>

body { margin: 0; padding: 0; }
#map { position: absolute; top: 0; bottom: 0; width: 100%; }

</style>