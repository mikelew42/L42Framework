<?php

/*
 * I could use a taxonomy to link Channels to Chat/Comment posts.
 * However, I think it would be better to
 */

/**
 * Class L42Chat
 * @property L42ChatDisplay $display
 */
class L42Chat extends WPxPost {
	/**
	 * THIS HAS TO BE PROTECTED, SO THE __GET METHOD WILL KICK IN!!!
	 * @var L42ChatDisplay
	 */
	protected $display;

	public function Run(){
		$this->display->chat_room();
	}

	protected function get_display(){
		// wait until we need it to load it
		if (!$this->display)
			$this->display = new L42ChatDisplay($this);

		return $this->display;
	}

	public static function Create($post_or_id = null){
		return new L42Chat($post_or_id);
	}
}