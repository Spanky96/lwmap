import LwMap from '../../lwmap/baidu/index';
import { red } from '_ansi-colors@3.2.4@ansi-colors';
var map = new LwMap('map-container', [120.3986156464, 31.7518537605], 13);
map.addMarker('test', '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png',
  [120.3986156464, 31.7518537605],
  [48, 68],
  [13, 30],
  function () {
    map.removeObject('test');
  });
  var point =  [[116.387112,39.920977], [116.385243,39.913063], [116.394226,39.917988], [116.401772,39.921364],	[116.41248,39.927893]];
  map.addPolygon('polygon', point, 'red','yellow', 2, 0.5);
  
  var mapLog = [];
  var village = [];
  $.get('http://221.228.70.15:7777/api/v3/wgh/getBounds.jsp',function(data){
  mapLog = data.data.coordinates;
  
  data.data.features.forEach(i => {
    village.push({'id':i.id,'gridNo':i.properties.gridNo,'name' : i.properties.name, 'cp' : i.properties.cp, 'geometry': i.geometry.coordinates, 'childNum':i.properties.childNum});
  });
  
  // 高德转百度坐标
  data.data.features.forEach(features => { 
    map.add3DBoundaryByFeature(features,'#344B59',0.5,1000,[3, 14.99],)
  })
  map.add3DBoundary();
},'json');

var roleId = {'userId' : '18hztuzdvrqvz', 'dateFrom' : '2019-04-16 07:36:54.000', 'dateTo' : '2019-04-16 17:36:54.000'}
$.get('http://221.228.70.15:7777/api/v3/zhdd/getRoute.jsp', roleId, function (data){
  console.log(data)
  var pathData = [];
  data.data.forEach((n ,index) => {
    pathData.push([]);
    n.forEach(j => {
      pathData[index].push([j.lng,j.lat])
    });
  });
  console.log(pathData);
  var animate = map.addMarkerAndPath(pathData, '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png', [48, 68], [24, 58], '123aaaaaaaaaaaS', [-35, 0], 'BM');
  animate.start();
  
  setTimeout(function (){
    // animate.pause()
  },5000)


},'json');