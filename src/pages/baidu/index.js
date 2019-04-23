import LwMap from '../../lwmap/baidu/index';
import { red } from '_ansi-colors@3.2.4@ansi-colors';
var map = new LwMap('map-container', [120.4286156464, 31.7098537605], 13);
map.addMarker('test', '//a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png',
  [120.3986156464, 31.7518537605],
  [48, 68],
  [13, 30],
  function () {
    map.removeObject('test');
  });
  var point =  [[116.387112,39.920977], [116.385243,39.913063], [116.394226,39.917988], [116.401772,39.921364],	[116.41248,39.927893]];
  map.addPolygon('polygon', point, 'red','yellow', 2, 0.5)