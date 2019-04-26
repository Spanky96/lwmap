// 高德地图
var AMap = require('AMap');
var $ = require('jquery');
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
    options = $.extend(options, zoomConfig);
    if (extraConfig) {
      options = $.extend(options, extraConfig);
    }
    var map = new AMap.Map(container, options);
    var vm = this;
    if (options.viewMode && options.viewMode == '3D') {
      map.plugin(['Map3D','ElasticMarker'], function () {
        map.AmbientLight = new AMap.Lights.AmbientLight([1, 1, 1], 0.5);
        map.DirectionLight = new AMap.Lights.DirectionLight([0, 0, 1], [1, 1, 1], 1);
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
              } else {
                if (vm.obj3DBoundBox.includes(n)) {
                  vm.object3Dlayer.add(n);
                }
              }
            }
          });
        });
      });
    }
    
    
    this.map = map;
    this.mapBox = {}; // 所有地图元素的数组
  }

  // 需要实现的方法
  /**
   * 地图移动
   * 参数 二维坐标
   */
  panTo (point) {
    this.map.panTo(point);
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
  addMarker (id, url, point, size, offset, onclick) {
    var markerContent = '' +
      `<div class="custom-content-marker">
      <img ${size ? 'width="size[0]" height="size[1]"' : ''}  src="${url}">
    </div>`;
    var marker = new AMap.Marker({
      position: new AMap.LngLat(point[0], point[1]),
      content: markerContent,
      offset: new AMap.Pixel(-offset[0], -offset[1]) // 以 icon 的 [center bottom] 为原点
    });
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
  add3DBoundary (id, boundArray, color = '#b5c817', opacity = 0.7, height = 2000, zooms = [3, 20], onclick = ()=> {}) {
    var bounds = [];
    boundArray.forEach(function (i) {
      bounds.push(new AMap.LngLat(i[0], i[1]));
    });
    var colorObj = Color(color);
    var rgba = [colorObj.red, colorObj.green, colorObj.blue, opacity];
    var wall = new AMap.Object3D.Prism({
      path: bounds,
      height: height,
      color: rgba
    });
    wall.zooms = zooms;
    wall.backOrFront = 'both';
    wall.transparent = true;
    wall.lwcolor = color;
    this.obj3DBoundBox.push(wall);
    this.object3Dlayer.add(wall);
    this.__addObject(id, wall);
    onclick && (wall.lwClick = onclick);
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
          var a = 0.7;
          // 不能重新赋值，只允许修改内容
          vertexColors.splice(i * 4, 4, r, g, b, a);
        }
        prism.needUpdate = true;
        prism.reDraw();
      });
      
      if (prism) {
        if(prism.type!='mesh'){
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
   * 添加雷达
   * 参数 position: 雷达中心点位置gps坐标
   * radius : 雷达半径
   * color: 雷达颜色
   */
  addRadar (position, radius, color = '#00ff00') {
    var radar = new AMap.Object3D.Mesh();
    radar.transparent = true;
    radar.backOrFront = 'front';
    var p = new AMap.LngLat(position[0], position[1]);
    var geometry = radar.geometry;
  
    var unit = 1;
    var range = 500;
    var count = range / unit;
    var colorObj = Color(color);
    for (var i = 0; i < count; i += 1) {
      var angle1 = i * unit * Math.PI / 180;
      var angle2 = (i + 1) * unit * Math.PI / 180;

      var p1x = Math.cos(angle1) * radius;
      var p1y = Math.sin(angle1) * radius;
      var p2x = Math.cos(angle2) * radius;
      var p2y = Math.sin(angle2) * radius;

      geometry.vertices.push(0, 0, 0);
      geometry.vertices.push(p1x, p1y, 0);
      geometry.vertices.push(p2x, p2y, 0);
      
      var opacityStart = 1 - Math.pow(i / count, 0.3);
      var opacityEnd = 1 - Math.pow((i + 1) / count, 0.3);
      geometry.vertexColors.push(colorObj.red, colorObj.green, colorObj.blue, opacityStart);
      geometry.vertexColors.push(colorObj.red, colorObj.green, colorObj.blue, opacityStart);
      geometry.vertexColors.push(colorObj.red, colorObj.green, colorObj.blue, opacityEnd);
    }
    radar.position(p);
    this.object3Dlayer.add(radar);
    function scan () {
      radar.rotateZ(-2);
      AMap.Util.requestAnimFrame(scan);
    }
    scan();
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
  addMarkerAndPath(pathArr, imgPath, imgSize, imgAncher, lableName = '', labelOffset = [-35, 0], position = 'BM', lineColor = '#1104c7', lineWeight = 10, speed = 1000) {
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
      zooms: [13, 20],
      styles: [{
        icon: {
          img: imgPath,
          size: imgSize, // 可见区域的大小
          ancher: imgAncher, // 锚点
          fitZoom: 13, // 最合适的级别
          scaleFactor: 2, // 地图放大一级的缩放比例系数
          maxScale: 4, // 最大放大比例
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
    var vm = this;
    pathArr.forEach((apath) => {
      var polyline = new AMap.Polyline({
        path: apath,
        showDir: true,
        strokeColor: lineColor, // 线颜色
        strokeWeight: lineWeight // 线宽
      });
      vm.map.add(polyline);
    });
   
    this.map.add(marker);
    return {
      marker: marker,
      path: pathArr,
      map: this.map,
      start: function () {
        var vm = this;
        var pathArr = [];
        this.path.forEach((n)=>{
          n.forEach(p=> {
            pathArr.push(p);
          });
        });
        this.marker.moveAlong(pathArr, speed);
        console.log(pathArr)
      },
      /**
       * 设置点暂停
       */
      pause: function () {
        this.marker.pauseMove();
      },
      /**
       * 设置点继续移动
       */
      resume: function () {
        this.marker.resumeMove();
      },
      /**
       * 设置点停止
       */
      stop: function () {
        this.marker.stopMove()
      },
      /**
       * 设置移动速度
       * @param {移动速度: 数值越大越快} setspeed 
       */
      setSpeed: function (setspeed){
        var vm = this;
        var pathArr = [];
        this.path.forEach((n)=>{
          n.forEach(p=> {
            pathArr.push(p);
          });
        });
        this.marker.moveAlong(pathArr, setspeed);
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
          strokeColor: lineColor,  //线颜色
          strokeOpacity: lineopacity,     //线透明度
          strokeWeight: lineWeight,      //线宽
          strokeStyle: lineStyle  //线样式
        });
        this.marker.on('moving', function (e) {// 边移动边画线
          passedPolyline.setPath(e.passedPath);
        });
      }
    }
  }

  // 私有方法
  __addObject (id, marker) {
    if (this.mapBox[id]) {
      // 已经有了
      this.map.remove(this.mapBox[id]);
    }
    this.map.add(marker);
    this.mapBox[id] = marker;
  }
}
module.exports = LwMap;
