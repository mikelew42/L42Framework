<?php
/*
Plugin Name: L42Framework
Description: Extension of the WPxFramework
Version: 0.1.0
Author: Michael Lewis
*/

// Includes
define( 'L42_VERSION', '0.1.0');
define( 'L42_PLUGIN_URL', plugin_dir_url( __FILE__ ));
define( 'L42_PATH', plugin_dir_path(__FILE__) );
define( 'L42_BASENAME', plugin_basename( __FILE__ ) );

add_action('plugins_loaded', 'l42_prepend');

function l42_prepend(){
	require_once('prepend.php');
}