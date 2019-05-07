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
    this.obj3DBoundBox = [];
    this.mapBox = {};
    
  }

  /**
   * 坐标转化
   * 高德坐标转百度坐标可悲调用方法调用方法
   * array: 处理好的数组
   * key
   */
  disposeGaoDeLng(array) {
    var point = [];
    array.forEach(i => {  
      i.geometry.forEach((n) => {
        var lng = [];
        n.forEach(j => {
          var log = this.bd_encrypt(j[0], j[1])
          lng.push([log.bd_lng,log.bd_lat])    
        });
        point.push(lng);
      });   
    });
    return point
  }
  //高德坐标转百度坐标方法
  bd_encrypt(gg_lng, gg_lat) {
    var X_PI = Math.PI * 3000.0 / 180.0;
    var x = gg_lng, y = gg_lat;
    var z = Math.sqrt(x * x + y * y) + 0.00002 * Math.sin(y * X_PI);
    var theta = Math.atan2(y, x) + 0.000003 * Math.cos(x * X_PI);
    var bd_lng = z * Math.cos(theta) + 0.0065;
    var bd_lat = z * Math.sin(theta) + 0.006;
    return {
        bd_lat: bd_lat,
        bd_lng: bd_lng
    };
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

  /** 
   * feature 所有网格数组
   * rgb 每个网格的颜色
   * opacity 每个网格填充物的透明度
   * height 2D地图未使用: 3D地图为网格高度
   * zooms 网格现实范围
   * onclick 点击事件
   * type 
   */
  add3DBoundaryByFeature(feature, rgb, opacity = 0.7, height = 2000, zooms = '', onclick = '', type = ''){
    var vm = this
    var bounds = [];
    feature.geometry.coordinates[0].forEach(function (i) {
      //如需坐标转换 , 高德坐标转换百度坐标
      var point = vm.bd_encrypt(i[0],i[1]);
      bounds.push(new BMap.Point(point.bd_lng,point.bd_lat));
      
     /* //若无需转换
      bounds.push(new BMap.Point(i[0],i[1]));*/
    });
   
    var polygon = new BMap.Polygon(bounds, {strokeColor: '#4CFFFF', fillColor: rgb, strokeWeight : 2, fillOpacity : opacity});
    this.obj3DBoundBox.push(polygon);
    this.map.addOverlay(polygon);
    
    // 文字图标位置如果需要转换
    var labelPoint = this.bd_encrypt(feature.properties.cp[0],feature.properties.cp[1]);
    var point = new BMap.Point(labelPoint.bd_lng,labelPoint.bd_lat);
    
    /** //文字图标若无需转换
    var point = new BMap.Point(feature.properties.cp[0],feature.properties.cp[1]);*/
    var opts = {
      position : point,    // 指定文本标注所在的地理位置
      offset   : new BMap.Size(-50, 0)    //设置文本偏移量
    }
    // 设置文字
    var label = new BMap.Label(feature.properties.name, opts);
    this.map.addOverlay(label);
    label.setStyle({
      color : "#4CFFFF",
      fontSize : "28px",
      height : "28px",
      lineHeight : "28px",
      fontFamily:"微软雅黑",
      backgroundColor:'#344B5900',
      border: 'none',
      fontWeight: 600
    });
    this.__addObject(feature.id + '_text', label);
  }

  // 监听百度地图图块, 鼠标移入移出事件, 点击事件
  add3DBoundary(color = '#FFF52F', opacity = '0.7'){
    var vm = this;
    this.obj3DBoundBox.forEach( n => {
      n.addEventListener('mousemove',function (ev) {
        n.setFillColor(color)
      });
      n.addEventListener('mouseout',function (ev) {
        n.setFillColor('#344B59');
      });
      n.addEventListener('click',function (ev) {
       vm.setCenterAndZoom([ev.point.lng, ev.point.lat], 17)
      });
    })
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
    var vm = this;
    var lineOverlayArry= [];//线路覆盖物
    var linePointArry = [];//线路对应的点位
    var lushu;
    // 将路线添加到地图上
    pathArr.forEach( n=> {
      var arr = [];
      //如需坐标转换 , 高德坐标转换百度坐标
      n.forEach(function (i) {
        var point = vm.bd_encrypt(i[0],i[1]);
        arr.push(new BMap.Point(point.bd_lng,point.bd_lat));
        //若无需转换
      // bounds.push(new BMap.Point(i[0],i[1]));
      });
      if(arr.length>0){
        linePointArry.push(arr);
      }
    });
    
    linePointArry.forEach( n => {
      var overlay = new BMap.Polyline(n, {strokeColor: lineColor, strokeWeight: lineWeight});
      lineOverlayArry.push(overlay);
      vm.map.addOverlay(overlay);
    })
    this.__addObject('lineOverlayArry',lineOverlayArry);
    if(linePointArry.length>0){
      vm.map.setViewport(linePointArry[0]);
    }

    return {
      lushu: lushu,
      path: linePointArry, 
      start: function () {
        var linePointArry = [];
        this.path.forEach((n) => {
          n.forEach(p => {
            linePointArry.push(p);
          });
        });
        lushu = new BMapLib.LuShu(vm.map, linePointArry, {
          defaultContent: lableName,
          autoView: true,//是否开启自动视野调整，如果开启那么路书在运动过程中会根据视野自动调整
          icon: new BMap.Icon(imgPath,{width:imgSize[0],height:imgSize[1]},{anchor:new BMap.Size(imgAncher[0],imgAncher[1])}),
          speed: speed,
          enableRotation: false,//是否设置marker随着道路的走向进行旋转
          landmarkPois: [],
        });
        vm.__addObject('lushu', lushu)
        lushu.start();
      },
      /**
       * 设置点暂停
       */
      pause: function () {
        lushu.pause();
      },
      /**
       * 设置点继续移动
       */
      resume: function () {
        lushu.start();
      },
      /**
       * 设置点停止
       */
      stop: function () {
        lushu.stop();
      },
      /**
       * 设置移动速度
       * @param {移动速度: 数值越大越快} setspeed 
       */
      setSpeed: function (setspeed) {
        lushu._opts.speed = setspeed;
      }
    } 
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