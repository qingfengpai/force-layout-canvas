importScripts("d3-v4.7.4.min.js");

var width;			// canvas 宽度
var height;			// canvas 高度
var G_timer;		// 定时器
var G_radius;		// 节点半径
var G_nodes = [];
var G_links = [];
var GD_wbids = [];
var G_simulation = d3.forceSimulation()
	.force("charge", d3.forceManyBody().strength(-10))
	.force("link", d3.forceLink()
					 // .distance(40)
					 // .strength(1)
					 .id(function(d, i){ return d.id; }))
	.force('collide', d3.forceCollide().strength(10))
	// .force("x", d3.forceX())
	// .force("y", d3.forceY())
	// .alphaTarget(0)
	// .on("tick", tick)
	;


onmessage = function(event) {
	switch (event.data.type) {
		case "init":
			init(event.data);
			break;
		case "get_focus_node":
			get_focus_node(event.data);
			break;
	}
};

function tick(){
	G_simulation.tick();
	console.log("haha");
	postMessage({type: "draw", nodes: G_nodes, links: G_links});
}

/**
 * 获得鼠标周围的节点
 */
function get_focus_node(data){
	var node = G_simulation.find(data.x, data.y, G_radius);
	postMessage({type: "the_focus_node", node: node});
}

/**
 * 初始化
 */
function init(data){
	G_radius = data.radius;
	width = data.width;
	height = data.height;
	var links = data.links;

	// 设置布局居中
	G_simulation.force("center", d3.forceCenter(width/2, height/2));

	var nodes = extract_nodes(JSON.stringify(links));
	var n = links.length;
	var null_index;
	for (var i = 0; i < n; i++) {
		var item = links[i];
		if (item['source'] == "") {
			null_index = i;
			continue;
		}
		item['id'] = item.source + "-" + item.target;
	}
	// 删除root和null的连接
	links.splice(null_index, 1);
	// // 初始化根节点
	// add_node(nodes[0]);
	// restart(G_nodes, G_links);

	// process(nodes, links);
	restart(nodes, links);
}


/**
 * 动态添加节点
 */
function process(p_nodes, p_links) {
	var per = 1000;
	var count = p_links.length;
	// 因为0代表root节点
	var index = 1;

	G_timer = setInterval(function(){
		var count = Math.ceil(Math.random() * 10);
		if (G_nodes.length == p_nodes.length) { clearInterval(G_timer); }
		while (count > 0) {
			try {
				add_node(p_nodes[index]);
				add_link(p_links[index-1]);
			} catch (e) {
				break;
			} finally {
				index++;
				count--;
			}
		}
		restart(G_nodes, G_links);
	}, per);

	setTimeout(function(){
		clearInterval(G_timer);
		postMessage({type: "end", nodes: G_nodes, links: G_links});
	}, per*count);
}

/**
 * 布局重启
 */
function restart(G_nodes, G_links) {
	G_simulation.nodes(G_nodes);
	G_simulation.force("link").links(G_links);
	G_simulation.alpha(1);

	var n = 300;
	for (var i = 0; i < n; ++i) {
		postMessage({type: "tick", progress: i/n});
		G_simulation.tick();
	}

	postMessage({type: "draw", nodes: G_nodes, links: G_links});
}

function add_node(node) {
	var ancestor = node.ancestor.split(',');
	var parent = G_nodes[GD_wbids.indexOf(ancestor.pop())];
	if (parent) {
		node.x = parent.x;
		node.y = parent.y;
		node.vx = node.vy = 0;
	} else {
		node.x = width/2;
		node.y = height/2;
		node.vx = node.vy = 0;
	}
	G_nodes.push(node);
	GD_wbids.push(node.id)
}

function add_link(link) {
	G_links.push(link);
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