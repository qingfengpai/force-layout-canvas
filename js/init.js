var radius = 2;
var width = 960;
var height = 600;
var meter = document.querySelector("#progress");
var GD_data = {};	// 全局数据

// 获取数据
// d3.request("../data/path-link-abe47d.json")		// middle
d3.request("../data/path-link-85f0c2.json")		// little
	.mimeType("application/json")
	.response(function(xhr) {
		var links = JSON.parse(xhr.responseText);
		main(links);
	})
	.get()
;


var simulation_worker = new Worker("js/force-compute.js");
simulation_worker.onmessage = function(event) {
	switch (event.data.type) {
		case "tick": return ticked(event.data);
		case "draw": return draw(event.data);
		case "the_focus_node": return get_focus_node(event.data.node);
	}
};

// 入口函数
function main(links){
	simulation_worker.postMessage({
		"type": "init",
		"radius": radius,
		"width": width,
		"height": height,
		"links": links
	});
}

function draw(data) {
	meter.style.display = "none";
	GD_data['nodes'] = data.nodes;
	GD_data['links'] = data.links;
	redraw(data.nodes, data.links);
}


/**
 * 进度条
 */
function ticked(data) {
  var progress = data.progress;
  meter.style.width = 100 * progress + "%";
}
