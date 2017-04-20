
var G_color = d3.scaleOrdinal().range(d3.schemeCategory20);
var transform = d3.zoomIdentity;
var G_curr_node; 	// 鼠标当前所在node
var context = d3.select("#rewteet")
	.attr("width", width)
	.attr("height", height)
	.call(d3.zoom().scaleExtent([1/10000, 8]).on("zoom", zoom))
	.on("mousemove", mousemoved)
	.node().getContext("2d")
	;
var GD_wbids = [];

/**
 * 重新绘图
 */
function redraw(nodes, links) {
	if (!nodes && !links) {
		nodes = GD_data['nodes'];
		links = GD_data['links'];
	}

	context.save();
	context.clearRect(0, 0, width, height);
	context.translate(transform.x, transform.y);
	context.scale(transform.k, transform.k);

	// var color = "#999";
	// context.lineWidth = 1;
	// context.fillStyle = color;
	// context.strokeStyle = color;
	// context.globalAlpha = .8;

	// context.beginPath();
	nodes.forEach(drawNode);
	links.forEach(drawLink);
	// context.stroke();

	context.restore();
}

/**
 * 画线
 */
function drawLink(l) {
	context.beginPath();
	context.moveTo(l.source.x, l.source.y);
	context.lineTo(l.target.x, l.target.y);
	change_color(context, l);
	context.stroke();
}

/**
 * 画点
 */
function drawNode(d) {
	// context.fillRect(d.x-1.5, d.y-1.5, 3, 3);

	context.beginPath();
	context.moveTo(d.x + 3, d.y);
	context.arc(d.x, d.y, 3, 0, (radius+1+1)*Math.PI);
	change_color(context, d);
	context.fill();
	context.stroke();
}

/**
 * 获取颜色
 */
function change_color(context, d){
	var color;
	var apacity = 1;
	var new_add = false;

	// if (GD_wbids.indexOf(d.id) == -1) {
	// 	color = "red";
	// 	new_add = true;
	// 	GD_wbids.push(d.id);
	// }

	// if (!new_add) {
		if (!color && !d.ancestor) {		// link
			color = "#999";
		} else {
			color = G_color(d.depth);
		}

		switch (d.color) {
			case "hilight":
				color = "#e6550d";
				break;
			case "nolight":
				apacity = 0.2;
				break;
		}
	// }

	context.fillStyle = color;
	context.strokeStyle = color;
	context.globalAlpha = apacity;
}


/**
 * 一个微博只可能转自另一条微博, 他们是一对一的关系
 */
function extract_nodes(response){
	var nodes = [];
	var ids_dict = {};
	var data = JSON.parse(response);
	var n = data.length;
	for (var i = 0; i < n; i++) {
		var item = data[i];
		var id = item.target;
		var prev = item.source;
		var index;
		var node = {};
		var pnode;			//父节点
		if (ids_dict[id]) {	continue; }
		node["id"] = id
		if (prev == "" || prev == "null") { 	// 是根节点
			node["ancestor"] = "null";
			node["depth"] = 0;
		} else {			// 不是根节点
			var pindex = ids_dict[prev];
			pnode = nodes[pindex];
			node["ancestor"] = pnode["ancestor"] + "," + pnode["id"];
			node["depth"] = pnode["depth"] + 1;
		}
		index = nodes.push(node)
		ids_dict[id] = index - 1;
	}
	return nodes;
}


/**
 * 获得当前鼠标所在的node
 */
function get_focus_node(node) {
	if (!node) {			// 不在node上
		if (G_curr_node) {	// 刚才在node上
			G_curr_node = null;
			clear_hilight();
		}
		return;
	}
	if (!G_curr_node) { G_curr_node = node; }
	else if (G_curr_node.id === node.id) { return; }
	G_curr_node = node;
	// console.log("mouseover: ", node);
	var nids = node.ancestor.split(",")
	nids.shift(); 			// 删除第一个元素 null, 没有意义
	nids.push(node.id);		// 把自身添加进去
	// console.log("mouseover: ", nids);
	hilight_path(nids);
}


/**
 * 鼠标离开node, G_curr_node 为空
 * 鼠标在一个node范围内活动，忽略
 */
function mousemoved() {
	var m = d3.mouse(this);
	var x = transform.invertX(m[0]);
	var y = transform.invertY(m[1]);
	simulation_worker.postMessage({
		"type": "get_focus_node",
		"x": x,
		"y": y
	});
}

/**
 * 高亮祖先节点和路径
 * 高亮一个节点，就把它从nids中取出，当nids的长度为0时，结束遍历
 */
function hilight_path(nids){
	var lines = JSON.parse(JSON.stringify(nids));
	for (var i = 0, n = GD_data.nodes.length; i < n; i++) {
		var item = GD_data.nodes[i];
		var k = nids.indexOf(item.id);
		if (k > -1) {
			item.color = "hilight";
			nids.splice(k, 1);
			// if (nids.length == 0) { break; }
		} else {
			item.color = "nolight";
		}
	}

	var hlinks = [];		// 高亮的links
	var length = lines.length - 1;
	lines.forEach(function(item, index) {
		if (index == length) { return; }
		hlinks.push( item + "-" + lines[index + 1] );
	});

	for (var i = 0, n = GD_data.links.length; i < n; i++) {
		var item = GD_data.links[i];
		var k = hlinks.indexOf(item.id);
		if (k > -1) {
			item.color = "hilight";
			hlinks.splice(k, 1);
			// if (hlinks.length == 0) { break; }
		} else {
			item.color = "nolight";
		}
	}
	redraw();
}

/**
 * 清除全部高亮
 */
function clear_hilight(){
	GD_data.nodes.forEach(function(item, index){
		item.color = "common";
	});
	GD_data.links.forEach(function(item, index){
		item.color = "common";
	});
	redraw();
}

/**
 * 缩放
 */
function zoom() {
	transform = d3.event.transform;
	redraw();
}
