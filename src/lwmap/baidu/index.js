// 百度地图
var BMap = require('BMap');
var $ = require('jquery');
const styleJson = require('./style');
class LwMap {
  /**
   * 构造方法
   * container: DOM ID
   * center: 中心点 eg: [120.4286156464, 31.7098537605]
   * zoom: 缩放级别 {Number | Array(3)[zoom. minZoom, maxZoom]} 
   */
  constructor(container, center = [116.404, 39.915], zoom = 13, extraConfig = {}) {
    var optionConfig = {};
    if (zoom instanceof Array) {
      optionConfig = $.extend(optionConfig, {
        minZoom: zoom[1],
        maxZoom: zoom[2],
      });
      zoom = zoom[0];
    }
    optionConfig = $.extend(optionConfig, extraConfig);
    var map = new BMap.Map(container, optionConfig);
    if (center instanceof Array) {
      map.centerAndZoom(new BMap.Point(center[0], center[1]), zoom);
    } else {
      map.centerAndZoom(center, zoom);
    }
    map.enableDragging();
    map.enableScrollWheelZoom();
    map.enableDoubleClickZoom();
    map.enableKeyboard();
    map.setMapStyle({styleJson:styleJson});
    this.map = map;
    this.mapBox = {};
  }

  // 需要实现的方法
  /**
   * 地图移动
   * 参数 二维坐标
   */
  panTo(point) {
    this.map.panTo(new BMap.Point(point[0], point[1]));
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
    this.map.centerAndZoom(new BMap.Point(point[0], point[1]), zoom);
  }

  /**
   * 增加标注物
   * 参数 id，url, 坐标点, 图片偏移，点击事件
   */
  addMarker(id, url, point, size, offset, onclick){
    var marker = new BMap.Marker(new BMap.Point(point[0], point[1])); // 创建标注
    marker.setIcon(new BMap.Icon(url, new BMap.Size(size[0], size[1]), {
      anchor: new BMap.Size(offset[0] * 2, offset[1] * 2),
    }));
    this.map.addOverlay(marker); // 将标注添加到地图中
    marker.addEventListener("click", onclick);
    this.__addObject(id, marker);
  }

  /**
   * 添加多边形覆盖物
   * 参数 id, 点的集合数组, 线的颜色, 多边形填充颜色, 线的粗细, 覆盖物的透明度
   */
  addPolygon(id, point, lineColor,fillColor, lineWeight,polygonOpa){        
    var bpoint = [];
    point.forEach(function (i){
      bpoint.push(new BMap.Point(i[0],i[1]))
    });
    var polygon = new BMap.Polygon(bpoint, {strokeColor:lineColor, fillColor: fillColor, strokeWeight:lineWeight, strokeOpacity:polygonOpa});    
    this.map.addOverlay(polygon);
    this.__addObject(id,polygon);
  }


  // 移除物体
  removeObject(id) {
    var obj = this.mapBox[id];
    if (obj) {
      this.map.removeOverlay(obj);
    }
    delete this.mapBox[id];
  }

  // 私有方法
  __addObject(id, marker) {
    if (this.mapBox[id]) {
      // 已经有了
      this.map.removeOverlay(this.mapBox[id]);
    }
    this.map.addOverlay(marker);
    this.mapBox[id] = marker;
  }
}
module.exports = LwMap;