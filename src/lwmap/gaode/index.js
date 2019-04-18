// 高德地图
var AMap = require('AMap');
var $ = require('jquery');
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
      zoomConfig = {zoom: zoom};
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
    this.map = map;
    this.mapBox = {};
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
  addMarker(id, url, point, size, offset, onclick){
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

  // 移除物体
  removeObject(name) {
    var obj = this.mapBox[name];
    if (obj) {
      this.map.remove(obj);
    }
    delete this.mapBox[name];
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