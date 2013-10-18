<?php

/**
 * Class L42ChatDisplay
 * @property L42ChatStream $stream
 */
class L42ChatDisplay extends WPxPostDisplay {

	/**
	 * @var L42Chat
	 */
	protected $post;

	/**
	 * @var L42Chat
	 */
	protected $chat;

	protected $stream;

	public function __construct(L42Chat $post = null){
		if ($post)
			$this->post = $this->chat = $post;
	}

	public function chat_room(){
		$this->classes[] = "chat-room";
		$this->start();
		$this->stream();
		$this->input();
		$this->end();
	}

	public function stream($content_only = false){
		if (!$this->stream)
			$this->stream = new L42ChatStream($this->chat);

		$this->stream->render($content_only);
	}

	public function input(){
		?>
		<div class="chat-input">
			<div class="chat-input-wrap">
				<p>Chat doesn't seem to be working.  Make sure JavaScript is turned on, and try reloading the page.</p>
			</div>
			<div class="chat-submit">SEND</div>
		</div><?php
	}

	public function row(){
		?><div class="chat-row">
			<?php $this->content(); ?>
		</div><?php
	}
}