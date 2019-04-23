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
  constructor(container, center = [116.404, 39.915], zoom = 13, extraConfig = {}) {
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
    map.AmbientLight = new AMap.Lights.AmbientLight([1, 1, 1], 0.5);
    map.DirectionLight = new AMap.Lights.DirectionLight([0, 0, 1], [1, 1, 1], 1);

    this.object3Dlayer = new AMap.Object3DLayer();;
    this.map = map;
    this.mapBox = {};// 所有地图元素的数组
    this.obj3DBoundBox = []; // 所有图块的数组
    var vm = this;
    this.map.on('zoomend', function () {
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
    })
  }

  // 需要实现的方法
  /**
   * 地图移动
   * 参数 二维坐标
   */
  panTo(point) {
    this.map.panTo(point);
  }

  /**
   * 设置地图缩放级别
   * 参数 zoom
   */
  setZoom(zoom) {
    this.map.setZoom(zoom);
  }

  /**
   * 设置地图缩放级别
   */
  setCenterAndZoom(point, zoom) {
    this.map.setZoomAndCenter(zoom, point);
  }

  /**
   * 增加标注物
   * 参数 id，url, 坐标点, 图片偏移，点击事件
   */
  addMarker(id, url, point, size, offset, onclick) {
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
  removeObject(name) {
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
  add3DBoundary(id, boundArray, color = '#b5c817', opacity = 0.7, height = 2000, zooms, onclick) {
    this.map.add(this.object3Dlayer);
    var bounds = [];
    boundArray.forEach(function (i) {
      bounds.push(new AMap.LngLat(i[0], i[1]))
    });
    var colorObj = Color(color);
    var rgba = [colorObj.red, colorObj.green, colorObj.blue, opacity]
    var wall = new AMap.Object3D.Prism({
      path: bounds,
      height: height,
      color: rgba
    });
    wall.zooms = zooms;
    wall.backOrFront = 'both';
    wall.transparent = true;
    wall.lwcolor = color;
    this.obj3DBoundBox.push(wall)
    this.object3Dlayer.add(wall);
    this.__addObject(id, wall)
    onclick && (wall.lwClick = onclick);
  }
  /**
   * 添加图块监听方法 : 添加点击放大 , 鼠标悬停换色监听
   * 参数 color : 鼠标选中颜色; opacity : 鼠标悬停图块透明度 
   */
  add3DBoundListen(color = '#FFF52F', opacity = 0.7) {
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
      })

      if (prism) {
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


  // 私有方法
  __addObject(id, marker) {
    if (this.mapBox[id]) {
      // 已经有了
      this.map.remove(this.mapBox[id]);
    }
    this.map.add(marker);
    this.mapBox[id] = marker;
  }
}
module.exports = LwMap;