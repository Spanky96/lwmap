// 高德地图
var AMap = require('AMap');
var _ = require('lodash');
// 字符串颜色转数字颜色
const Color = require('color-js');
class LwMap {
  /**
   * 全局对象： 
   * this.map 真实的map对象
   * this.mapBox map中存放覆盖物的容器
   */

  /**
   * 构造方法
   * container: DOM ID
   * center: 中心点 eg: [116.404, 39.915] 北京
   * zoom: 缩放级别 {Number | Array(3)[zoom, minZoom, maxZoom]} 
   */
  constructor (container, center = [116.404, 39.915], zoom = 13, extraConfig = {}) {
    var options = {
      resizeEnable: true,
      rotateEnable: true,
      pitchEnable: true,
      buildingAnimation: true,
      expandZoomRange: true,
      center: center,
      mapStyle: 'amap://styles/4fdb80e026ac9333276a536015019937'
    };
    var zoomConfig;
    if (zoom instanceof Number) {
      zoomConfig = {
        zoom: zoom
      };
    } else if (zoom instanceof Array) {
      zoomConfig = {
        zoom: zoom[0],
        zooms: [zoom[1], zoom[2]]
      };
    }
    options = _.extend(options, zoomConfig);
    if (extraConfig) {
      options = _.extend(options, extraConfig);
    }
    var map = new AMap.Map(container, options);
    var vm = this;
    vm.map = map;
    vm.mapBox = {}; // 所有地图元素的数组
    if (options.viewMode && options.viewMode == '3D') {
      map.plugin(['Map3D', 'ElasticMarker'], function () {
        map.AmbientLight = new AMap.Lights.AmbientLight([1, 1, 1], 1);
        map.DirectionLight = new AMap.Lights.DirectionLight([1, 1, 1], [1, 1, 1], 1);
        var object3Dlayer = new AMap.Object3DLayer();
        map.add(object3Dlayer);
        vm.object3Dlayer = object3Dlayer;
        vm.obj3DBoundBox = []; // 所有图块的数组
        map.on('zoomend', function () {
          var zoom = vm.map.getZoom();
          vm.obj3DBoundBox.forEach(function (n) {
            if (n.zooms) {
              if (n.zooms[0] > zoom || n.zooms[1] < zoom) {
                vm.object3Dlayer.remove(n);
                if (n.linkObject) {
                  n.linkObject.forEach(o => {
                    if (o.type == 'prism') {
                      vm.object3Dlayer.remove(o);
                    } else {
                      vm.map.remove(o);
                    }
                  });
                }
              } else {
                if (vm.obj3DBoundBox.includes(n)) {
                  vm.object3Dlayer.add(n);
                  if (n.linkObject) {
                    n.linkObject.forEach(o => {
                      if (o.type == 'prism') {
                        vm.object3Dlayer.add(o);
                      } else {
                        vm.map.add(o);
                      }
                    });
                  }
                }
              }
            }
          });
        });
        vm.add3DBoundListen();
      });
    }
  }

  // 需要实现的方法
  /**
   * 地图移动
   * 参数 二维坐标
   */
  panTo (point) {
    this.map.panTo(point);
  }

  addControlBar (offset = [0, 0], zoom = 1) {
    var vm = this;
    vm.map.plugin(['AMap.ControlBar'], function () {
      vm.map.addControl(new AMap.ControlBar({
        showZoomBar: false,
        showControlButton: true,
        position: { left: offset[0] + 'px', top: offset[1] + 'px', zoom: zoom }
      }));
    });
  }

  /**
   * 设置地图缩放级别
   * 参数 zoom
   */
  setZoom (zoom) {
    this.map.setZoom(zoom);
  }

  /**
   * 设置地图缩放级别
   */
  setCenterAndZoom (point, zoom) {
    this.map.setZoomAndCenter(zoom, point);
  }

  /**
   * 增加标注物
   * 参数 id，url, 坐标点, 图片偏移，点击事件
   */
  addMarker (id, url, point, size, offset, onclick, params) {
    var markerContent = '' +
      `<div class="custom-content-marker">
      <img ${size ? 'width="size[0]" height="size[1]"' : ''}  src="${url}">
    </div>`;
    var marker = new AMap.Marker({
      position: new AMap.LngLat(point[0], point[1]),
      content: markerContent,
      offset: new AMap.Pixel(-offset[0], -offset[1]) // 以 icon 的 [center bottom] 为原点
    });
    marker = _.extend(marker, params);
    onclick && marker.on('click', onclick);
    this.__addObject(id, marker);
  }

  // 移除物体 参数 name : 需要删除物体的ID
  removeObject (name) {
    var obj = this.mapBox[name];
    if (obj) {
      this.map.remove(obj);
    }
    delete this.mapBox[name];
  }

  // 
  /**
   * 添加 3D 图块
   * 参数 id : 每一块图块; boundArray : 每一个图块的GPS坐标; color : 图块颜色;
   * opacity : 透明度; height : 图块高度; zooms :[显示区间]; onclick: 点击事件
   */
  add3DBoundary (id, boundArray, color = '#b5c817', opacity = 0.7, height = 2000, zooms = '', onclick = '') {
    var bounds = [];
    boundArray.forEach(function (i) {
      bounds.push(new AMap.LngLat(i[0], i[1]));
    });
    var colorObj = Color(color);
    var rgba = [colorObj.red, colorObj.green, colorObj.blue, opacity];
    var mesh = new AMap.Object3D.Prism({
      path: bounds,
      height: height,
      color: rgba
    });
    mesh.zooms = zooms;
    mesh.backOrFront = 'both';
    mesh.transparent = true;
    mesh.lwcolor = color;
    this.obj3DBoundBox.push(mesh);
    this.object3Dlayer.add(mesh);
    this.__addObject(id, mesh);
    onclick && (mesh.lwClick = onclick);
  }

  add3DBoundaryByFeature (feature, rgb, opacity = 0.7, height = 2000, zooms = '', onclick = '', type = '') {
    var bounds = [];
    feature.geometry.coordinates[0].forEach(function (i) {
      bounds.push(new AMap.LngLat(i[0], i[1]));
    });
    var color = rgb || feature.properties.fillColor || this.__getRandomRgbColor();

    var colorObj = Color(color);
    var rgba = [colorObj.red, colorObj.green, colorObj.blue, opacity];
    var mesh = new AMap.Object3D.Prism({
      path: bounds,
      height: height,
      color: rgba
    });
    mesh.zooms = zooms;
    mesh.type = type || feature.type;
    mesh.backOrFront = 'both';
    mesh.transparent = true;
    mesh.lwcolor = color;
    mesh.lwOpacity = opacity;

    var text = new AMap.Text({
      text: feature.properties.name,
      verticalAlign: 'bottom',
      position: feature.properties.cp,
      height: height * 1.2,
      style: {
        'background-color': 'transparent',
        '-webkit-text-stroke': 'red',
        '-webkit-text-stroke-width': '0.5px',
        'text-align': 'center',
        'border': 'none',
        'color': 'white',
        'font-size': '22px',
        'font-weight': 600
      }
    });
    var wall = new AMap.Object3D.Wall({
      path: bounds,
      height: height * 1.1,
      color: '#1ae3fc'
    });
    this.object3Dlayer.add(wall);

    this.__addObject(feature.id + '_text', text);
    mesh.linkObject = [text, wall]; // 把标题和文字组合起来
    this.obj3DBoundBox.push(mesh);
    this.object3Dlayer.add(mesh);
    onclick && (mesh.lwClick = onclick);
  }

  /**
   * 清除类型为type的所有网格
   */
  removeFeature (type) {
    var vm = this;
    vm.obj3DBoundBox.forEach(function (obj) {
      if (obj.type == type) {
        if (obj.linkObject) {
          obj.linkObject.forEach(o => {
            vm.map.remove(o);
            vm.object3Dlayer.remove(o);
          });
        }
        vm.object3Dlayer.remove(obj);
      }
    });
    _.remove(vm.obj3DBoundBox, (n) => { return n.type == type; });
  }

  /**
   * 添加图块监听方法 : 添加点击放大 , 鼠标悬停换色监听
   * 参数 color : 鼠标选中颜色; opacity : 鼠标悬停图块透明度 
   */
  add3DBoundListen (color = '#FFF52F', opacity = 0.7) {
    var _map = this.map;
    var vm = this;
    this.map.on('mousemove', function (ev) {
      var pixel = ev.pixel;
      var px = new AMap.Pixel(pixel.x, pixel.y);
      var obj = _map.getObject3DByContainerPos(px, [vm.object3Dlayer], false) || {};
      var prism = obj.object;
      vm.obj3DBoundBox.forEach(function (prism) {
        var vertexColors = prism.geometry.vertexColors;
        var initColor = prism.lwcolor;
        var colorObj = Color(initColor);
        var len = vertexColors.length;
        for (var i = 0; i < len / 4; i++) {
          var r = colorObj.red;
          var g = colorObj.green;
          var b = colorObj.blue;
          var a = prism.lwOpacity || 0.7;
          // 不能重新赋值，只允许修改内容
          vertexColors.splice(i * 4, 4, r, g, b, a);
        }
        prism.needUpdate = true;
        prism.reDraw();
      });

      if (prism && prism.lwClick) {
        var colorObj = Color(color);
        var vertexColors = prism.geometry.vertexColors;
        var len = vertexColors.length;
        for (var i = 0; i < len / 4; i++) {
          var r = colorObj.red;
          var g = colorObj.green;
          var b = colorObj.blue;
          var a = opacity;
          // 不能重新赋值，只允许修改内容
          vertexColors.splice(i * 4, 4, r, g, b, a);
        }
        prism.needUpdate = true;
        prism.reDraw();
      }
    });
    this.map.on('click', function (ev) {
      var pixel = ev.pixel;
      var px = new AMap.Pixel(pixel.x, pixel.y);
      var obj = _map.getObject3DByContainerPos(px, [vm.object3Dlayer], false) || {};
      var prism = obj.object;
      prism && prism.lwClick && prism.lwClick(ev, prism);
    });
  }
  
  /**
   * 设置轨迹路线
   * 轨迹数组 pathArr: [[a,b], [a,b]],  
   * 图片路径 imgPath: url,  
   * 图片大小 imgSize: [num,num],  
   * 图片锚点 imgAncher: [num,num],  
   * 图片标签名称 lableName: 'abc',  
   * 图片标签偏移 labelOffset: [num,num],  
   * 图片与锚点的位置 position: /BL、BM、BR、ML、MR、TL、TM、TR分别代表左下角、底部中央、右下角、左侧中央、右侧中央、左上角、顶部中央、右上角,  
   * 轨迹线 lineColor: '#aaaa',
   * 轨迹线宽 lineWeight : num,
   * 点移动速度 speed : num,
   * return 点操控办法:start, pause, resume, stop, setSpeed, setPassLine
   */
  addMarkerAndPath (pathArr, imgPath, imgSize, imgAncher, lableName = '', labelOffset = [-35, 0], position = 'BM', lineColor = '#1104c7', lineWeight = 10, speed = 1000) {
    var zoomStyleMapping = {
      13: 0,
      14: 0,
      15: 0,
      16: 0,
      17: 0,
      18: 0,
      19: 0,
      20: 0
    };
    var marker = new AMap.ElasticMarker({
      position: pathArr[0][0],
      zooms: [3, 20],
      styles: [{
        icon: {
          img: imgPath,
          size: imgSize, // 可见区域的大小
          ancher: imgAncher, // 锚点
          fitZoom: 13, // 最合适的级别
          scaleFactor: 1.1, // 地图放大一级的缩放比例系数
          maxScale: 2, // 最大放大比例
          minScale: 1 // 最小放大比例
        },
        label: {
          content: lableName,
          offset: labelOffset,
          position: position
        }
      }],
      zoomStyleMapping: zoomStyleMapping
    });
    marker.linkObject = [];
    var vm = this;
    pathArr.forEach((apath) => {
      var polyline = new AMap.Polyline({
        path: apath,
        showDir: true,
        strokeColor: lineColor, // 线颜色
        strokeWeight: lineWeight // 线宽
      });
      vm.map.add(polyline);
      marker.linkObject.push(polyline);
    });
    // 删掉老的
    var oldMarker = this.mapBox.pathAndMarker;
    if (oldMarker) {
      oldMarker.stopMove();
      var linkObjs = oldMarker.linkObject;
      if (linkObjs) {
        var map = this.map;
        linkObjs.forEach((n) => {
          map.remove(n);
        });
      }
    }
    this.__addObject('pathAndMarker', marker);
    return {
      marker: marker,
      path: pathArr,
      map: this.map,
      status: 0, // 0 停止   1: 在跑  2: 暂停,
      speed: speed,
      afterMoveAlongEnd: function () {
        console.log('跑完第' + ++this.pathIndex + '段');
        var nextPath = this.path[this.pathIndex];
        if (nextPath) {
          this.run(this.speed, this.pathIndex);
        }
      },
      init: function () {
        // 增加监听方法
        this.marker.on('movealong', this.afterMoveAlongEnd, this);
      },
      run: function (v, pathIndex = 0) {
        this.status = 1;
        this.pathIndex = pathIndex;
        console.log('开始跑第' + (this.pathIndex + 1) + '段');
        this.speed = v || this.speed;
        var vm = this;
        setTimeout(function () {
          vm.marker.moveAlong(vm.path[pathIndex], v);
        }, 100);
      },
      /**
       * 设置点暂停
       */
      pause: function () {
        if (this.status == 2) { return; }
        this.status = 2;
        this.marker.pauseMove();
      },
      /**
       * 设置点继续移动
       */
      resume: function () {
        if (this.status == 1) { return; }
        this.status = 1;
        this.marker.resumeMove();
      },
      /**
       * 设置点停止
       */
      stop: function () {
        if (this.status == 0) { return; }
        this.status = 0;
        this.marker.stopMove();
      },
      /**
       * 设置已经行驶的路线
       * 已行驶路线颜色 lineColor 
       * 已行驶路线透明度 lineopacity 
       * 已行驶路线线宽 lineWeight 
       * 已行驶路线直线样式 lineStyle 
       */
      setPassLine: function (lineColor = '#AF5', lineopacity = 1, lineWeight = 6, lineStyle = 'solid') {
        var passedPolyline = new AMap.Polyline({
          map: this.map,
          strokeColor: lineColor,  
          strokeOpacity: lineopacity,     
          strokeWeight: lineWeight,     
          strokeStyle: lineStyle  
        });
        this.marker.on('moving', function (e) {
          passedPolyline.setPath(e.passedPath);
        });
      }
    };
  }

  /**
   * 清除类型为type的所有网格
   */
  removeObjByTypename (type) {
    var vm = this;
    vm.obj3DBoundBox.forEach(function (obj) {
      if (obj.type == type) {
        if (obj.linkObject) {
          obj.linkObject.forEach(o => {
            vm.map.remove(o);
            vm.object3Dlayer.remove(o);
          });
        }
        vm.object3Dlayer.remove(obj);
      }
    });
    _.remove(vm.obj3DBoundBox, (n) => { return n.type == type; });
  }

  /**
   * 清除地图图标
   */
  clearActivities (foo) {
    var vm = this;
    !foo && (foo = (n) => n.type == 'activity');
    if (foo instanceof Function) {
      var keys = Object.keys(vm.mapBox);
      keys.forEach((key) => {
        let obj = vm.mapBox[key];
        if (foo(obj)) {
          vm.removeObject(key);
        }
      });
    }
  }

  showInfoWindow (content, position, anchor = 'bottom-center') {
    var infoWindow = new AMap.InfoWindow({
      anchor,
      content
    });
    infoWindow.open(this.map, position);
  }

  // 私有方法
  __addObject (id, marker) {
    var obj = this.mapBox[id];
    if (obj) {
      // 已经有了
      // var linkObjs = obj.linkObject;
      // if (linkObjs) {
      //   var map = this.map;
      //   linkObjs.forEach((n) => {
      //     map.remove(n);
      //   });
      // }
      this.map.remove(obj);
    }
    this.map.add(marker);
    this.mapBox[id] = marker;
  }
  __getRandomRgbColor () {
    return new Array(3).fill(255).map((o) => {
      return o * Math.random();
    });
  }
}
module.exports = LwMap;
