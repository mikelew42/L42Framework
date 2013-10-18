<?php


class L42ChatStream extends WPxDisplay {
	protected $id;
	protected $classes = array('chat-stream');
	protected $attr;
	protected $tag = 'div';
	protected $content;

	/**
	 * @var L42Chat
	 */
	protected $chat;

	public function __construct(L42Chat $post = null){
		if ($post)
			$this->post = $this->chat = $post;
	}

	public function render($content_only = false){
		if ($content_only){
			$this->stream();
			return;
		}

		$this->start();
		$this->stream();
		$this->end();
	}

	public function stream(){
		$args = array(
			'numberposts' => -1,
			'post_parent' => $this->chat->id(),
			'post_status' => 'publish',
			'order' => 'ASC'
		);

		$wp_posts = get_children($args);
		/**
		 * @var L42Chat[] $chats
		 */
		$chats = array();
		foreach ($wp_posts as $id => $post){
			$chats[$id] = new L42Chat($post);
			$chats[$id]->display->row();
		}
	}
}
