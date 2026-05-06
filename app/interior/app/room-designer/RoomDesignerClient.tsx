'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';

export default function RoomDesignerClient() {
  useEffect(() => {
    // Initialize blueprint3d after all scripts are loaded
    const initTimeout = setTimeout(() => {
      if ((window as any).__BP3D_INIT__) {
        const opts = {
          floorplannerElement: 'floorplanner-canvas',
          threeElement: '#viewer',
          threeCanvasElement: 'three-canvas',
          textureDir: "models/textures/",
          widget: false
        };
        (window as any).__BP3D_INIT__(opts, { loadSample: true });
      }
    }, 500);

    return () => clearTimeout(initTimeout);
  }, []);

  return (
    <>
      <link href="/css/bootstrap.css" rel="stylesheet" />
      <link href="/css/example.css" rel="stylesheet" />
      <style>{`
        html, body {
          height: 100%;
          overflow: hidden;
        }
        .main-row {
          height: 100vh;
        }
        #viewer {
          position: relative;
          width: 100%;
          height: 100%;
          background: #f0f0f0;
        }
        #viewer canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        #floorplanner {
          position: relative;
          width: 100%;
          height: 100%;
        }
        #floorplanner-canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
      `}</style>

      <Script src="/js/jquery.js" strategy="afterInteractive" />
      <Script src="/js/bootstrap.js" strategy="afterInteractive" />
      <Script src="/js/three.min.js" strategy="afterInteractive" />
      <Script src="/js/gltf-compat.js" strategy="afterInteractive" />
      <Script src="/js/GLTFLoader.js" strategy="afterInteractive" />
      <Script src="/js/MTLLoader.js" strategy="afterInteractive" />
      <Script src="/js/OBJLoader.js" strategy="afterInteractive" />
      <Script src="/js/OBJMTLLoader.js" strategy="afterInteractive" />
      <Script src="/js/blueprint3d.js" strategy="afterInteractive" />
      <Script src="/js/items.js" strategy="afterInteractive" />
      <Script src="/js/example.js" strategy="afterInteractive" onLoad={() => {
        // Trigger initialization when example.js finishes loading
        if ((window as any).__BP3D_INIT__) {
          const opts = {
            floorplannerElement: 'floorplanner-canvas',
            threeElement: '#viewer',
            threeCanvasElement: 'three-canvas',
            textureDir: "models/textures/",
            widget: false
          };
          (window as any).__BP3D_INIT__(opts, { loadSample: true });
        }
      }} />

      <div className="container-fluid">
        <div className="row main-row">
          {/* Left Column */}
          <div className="col-xs-3 sidebar">
            {/* Main Navigation */}
            <ul className="nav nav-sidebar">
              <li id="floorplan_tab"><a href="#">
                Edit Floorplan
                <span className="glyphicon glyphicon-chevron-right pull-right"></span>
              </a></li>
              <li id="design_tab"><a href="#">
                Design
                <span className="glyphicon glyphicon-chevron-right pull-right"></span>
              </a></li>
              <li id="items_tab"><a href="#">
                Add Items
                <span className="glyphicon glyphicon-chevron-right pull-right"></span>
              </a></li>
            </ul>
            <hr />

            {/* Context Menu */}
            <div id="context-menu">
              <div style={{margin: '0 20px'}}>
                <span id="context-menu-name" className="lead"></span>
                <br /><br />
                <button className="btn btn-block btn-danger" id="context-menu-delete">
                  <span className="glyphicon glyphicon-trash"></span>
                  Delete Item
                </button>
                <br />
                <div className="panel panel-default">
                  <div className="panel-heading">Adjust Size</div>
                  <div className="panel-body" style={{color: '#333333'}}>
                    <div className="form form-horizontal" style={{fontSize: '1.1em'}}>
                      <div className="form-group">
                        <label className="col-sm-5 control-label">
                          Width
                        </label>
                        <div className="col-sm-6">
                          <input type="number" className="form-control" id="item-width" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="col-sm-5 control-label">
                          Depth
                        </label>
                        <div className="col-sm-6">
                          <input type="number" className="form-control" id="item-depth" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="col-sm-5 control-label">
                          Height
                        </label>
                        <div className="col-sm-6">
                          <input type="number" className="form-control" id="item-height" />
                        </div>
                      </div>
                    </div>
                    <small><span className="text-muted">Measurements in inches.</span></small>
                  </div>
                </div>
                <label><input type="checkbox" id="fixed" /> Lock in place</label>
                <br /><br />
              </div>
            </div>

            {/* Floor textures */}
            <div id="floorTexturesDiv" style={{display: 'none', padding: '0 20px'}}>
              <div className="panel panel-default">
                <div className="panel-heading">Adjust Floor</div>
                <div className="panel-body" style={{color: '#333333'}}>
                  <div className="col-sm-6" style={{padding: '3px'}}>
                    <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/light_fine_wood.jpg" data-texture-stretch="false" data-texture-scale="300">
                      <img alt="Thumbnail light fine wood" src="rooms/thumbnails/thumbnail_light_fine_wood.jpg" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Wall Textures */}
            <div id="wallTextures" style={{display: 'none', padding: '0 20px'}}>
              <div className="panel panel-default">
                <div className="panel-heading">Adjust Wall</div>
                <div className="panel-body" style={{color: '#333333'}}>
                  <div className="col-sm-6" style={{padding: '3px'}}>
                    <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/marbletiles.jpg" data-texture-stretch="false" data-texture-scale="300">
                      <img alt="Thumbnail marbletiles" src="rooms/thumbnails/thumbnail_marbletiles.jpg" />
                    </a>
                  </div>
                  <div className="col-sm-6" style={{padding: '3px'}}>
                    <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/wallmap_yellow.png" data-texture-stretch="true" data-texture-scale="">
                      <img alt="Thumbnail wallmap yellow" src="rooms/thumbnails/thumbnail_wallmap_yellow.png" />
                    </a>
                  </div>
                  <div className="col-sm-6" style={{padding: '3px'}}>
                    <a href="#" className="thumbnail texture-select-thumbnail" data-texture-url="rooms/textures/light_brick.jpg" data-texture-stretch="false" data-texture-scale="100">
                      <img alt="Thumbnail light brick" src="rooms/thumbnails/thumbnail_light_brick.jpg" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="col-xs-9 main">
            {/* 3D Viewer */}
            <div id="viewer">
              <canvas id="three-canvas"></canvas>
              <div id="main-controls">
                <a href="#" className="btn btn-default btn-sm" id="new">
                  New Plan
                </a>
                <a href="#" className="btn btn-default btn-sm" id="saveFile">
                  Save Plan
                </a>
                <a className="btn btn-sm btn-default btn-file">
                  <input type="file" className="hidden-input" id="loadFile" />
                  Load Plan
                </a>
              </div>

              <div id="camera-controls">
                <a href="#" className="btn btn-default bottom" id="zoom-out">
                  <span className="glyphicon glyphicon-zoom-out"></span>
                </a>
                <a href="#" className="btn btn-default bottom" id="reset-view">
                  <span className="glyphicon glyphicon glyphicon-home"></span>
                </a>
                <a href="#" className="btn btn-default bottom" id="zoom-in">
                  <span className="glyphicon glyphicon-zoom-in"></span>
                </a>

                <span>&nbsp;</span>

                <a className="btn btn-default bottom" href="#" id="move-left" >
                  <span className="glyphicon glyphicon-arrow-left"></span>
                </a>
                <span className="btn-group-vertical">
                  <a className="btn btn-default" href="#" id="move-up">
                    <span className="glyphicon glyphicon-arrow-up"></span>
                  </a>
                  <a className="btn btn-default" href="#" id="move-down">
                    <span className="glyphicon glyphicon-arrow-down"></span>
                  </a>
                </span>
                <a className="btn btn-default bottom" href="#" id="move-right" >
                  <span className="glyphicon glyphicon-arrow-right"></span>
                </a>
              </div>

              <div id="loading-modal">
                <h1>Loading...</h1>
              </div>
            </div>

            {/* 2D Floorplanner */}
            <div id="floorplanner">
              <canvas id="floorplanner-canvas"></canvas>
              <div id="floorplanner-controls">
                <button id="move" className="btn btn-sm btn-default">
                  <span className="glyphicon glyphicon-move"></span>
                  Move Walls
                </button>
                <button id="draw" className="btn btn-sm btn-default">
                  <span className="glyphicon glyphicon-pencil"></span>
                  Draw Walls
                </button>
                <button id="delete" className="btn btn-sm btn-default">
                  <span className="glyphicon glyphicon-remove"></span>
                  Delete Walls
                </button>
                <span className="pull-right">
                  <button className="btn btn-primary btn-sm" id="update-floorplan">Done &raquo;</button>
                </span>
              </div>
              <div id="draw-walls-hint">
                Press the "Esc" key to stop drawing walls
              </div>
            </div>

            {/* Add Items */}
            <div id="add-items">
              <div className="row" id="items-wrapper">
                {/* Items added here by items.js */}
              </div>
            </div>
          </div>
          {/* End Right Column */}
        </div>
      </div>
    </>
  );
}
