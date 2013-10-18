<?php
add_action('init', 'l42_enqueue');

function l42_enqueue(){
	//wp_enqueue_style('redactor', L42_PLUGIN_URL . 'js/redactor/redactor.min.css');
	//wp_enqueue_script('redactor', L42_PLUGIN_URL . 'js/redactor/redactor.js', array('jquery'));

	wp_enqueue_style('l42-chat', L42_PLUGIN_URL . 'css/chat.css');
	wp_enqueue_script('l42-chat', L42_PLUGIN_URL . 'js/chat.js', array('underscore', 'backbone', 'jquery', 'wpx-debug'));

	wp_deregister_script('underscore');
	wp_deregister_script('backbone');
	wp_enqueue_script('underscore', L42_PLUGIN_URL . 'js/underscore.js');
	wp_enqueue_script('backbone', L42_PLUGIN_URL . 'js/backbone.js', array('underscore', 'jquery'));
}