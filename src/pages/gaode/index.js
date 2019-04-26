import LwMap from '../../lwmap/gaode/index';
var map = new LwMap('map-container', [120.4286156464, 31.7098537605], [13.3, 3, 20], {
  pitch: 42,
  viewMode: '3D',
  rotation: -21.5443
});
map.addMarker('test', '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png', [120.3986156464, 31.7518537605], [46, 68], [13, 30], function () {
  map.removeObject('test');
});

// 地图边界点
var mapLog = [];
// 村庄信息
var village = [];
// 设置各个村庄边界颜色
var villageColor = ['#FF7F24', '#FF69B4', '#EE7621', '#FF1493', '#CD661D', '#FFC0CB', '#8B4513', '#FFB6C1', '#FF3030', '#DB7093', '#EE2C2C', '#B03060',	'#CD2626', '#C71585',	'#8B1A1A', '#D02090', '#FF4040', '#FF00FF', '#EE3B3B', '#EE82EE', '#CD3333']

$.get('http://221.228.70.15:7777/api/v3/wgh/getBounds.jsp',function(data){
  mapLog = data.data.coordinates;
  data.data.features.forEach(i => {
    village.push({'id':i.id,'gridNo':i.properties.gridNo,'name' : i.properties.name, 'cp' : i.properties.cp, 'geometry': i.geometry.coordinates, 'childNum':i.properties.childNum});
  });
  // village.forEach((i, index) => {
  //   map.add3DBoundary('\'3D'+i.id+'Boundary\'',i.geometry[0],villageColor[index], 0.7, 2000, [10, 15],function (ev, prism){
  //     map.setCenterAndZoom([ev.lnglat.Q ,ev.lnglat.P], 18)
  //   });
  //   map.addMarker(i.id+'Marker\'', '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png', i.cp, [46, 68], [13, 30]);
  //   map.add3DBoundListen();
  //   map.addRadar(i.geometry[0][0],10000)
  // })
},'json');

// 请求网格中所有人员
var animate = null;
var roleId = {'userId' : '18hztuzdvrqvz', 'dateFrom' : '2019-04-16 07:36:54.000', 'dateTo' : '2019-04-16 17:36:54.000'}
$.get('http://221.228.70.15:7777/api/v3/zhdd/getRoute.jsp', roleId, function (data){
  console.log(data.data);
 
  
  var pathData = [];
  data.data.forEach((n ,index) => {
    pathData.push([]);
    n.forEach(j => {
      pathData[index].push([j.lng,j.lat])
    });
  });
  console.log(pathData)
  var animate = map.addMarkerAndPath(pathData, '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png', [20, 20], [10, 20], '123', [-35, 0], 'BM');
  animate.start();
  animate.stop();
  animate.setPassLine();
  animate.setSpeed(100000);
 
},'json');
 