<?php
require_once('functions.php');

$autoload_directories = array(
	'L42Chat'
);

foreach ($autoload_directories as $dir)
	foreach (glob(L42_PATH . $dir . "/*.php") as $filename)
		require_once($filename);


class L42Framework extends WPxBase {

	public function __construct(){
		add_action('init', array($this, 'init'));
	}

	// Init function will run on every page load
	public function init(){
		$this->register_post_types();

	}

	public function register_post_types(){
		$args = array(
			'label'              => 'Chats',
			'public'             => true,
			'hierarchical'       => true,
			'supports'           => array( 'title', 'editor', 'author', 'thumbnail', 'excerpt', 'comments' )
		);

		register_post_type( 'chat', $args );
	}
}

//WPxRewrite::Init();  // I think this has to run outside of any hooks

global $l42;

$l42 = new L42Framework();