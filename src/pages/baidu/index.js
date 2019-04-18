import LwMap from '../../lwmap/baidu/index';
var map = new LwMap('map-container', [120.4286156464, 31.7098537605], 13);
map.addMarker('test', '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png',
  [120.3986156464, 31.7518537605],
  [48, 68],
  [13, 30],
  function () {
    map.removeObject('test');
  });