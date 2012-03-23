// Universal Subtitles, universalsubtitles.org
//
// Copyright (C) 2010 Participatory Culture Foundation
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see
// http://www.gnu.org/licenses/agpl-3.0.html.

goog.provide('unisubs.player.WordPressTVVideoPlayer');

/**
 * @constructor
 * @param {unisubs.player.VimeoVideoSource} videoSource
 * @param {boolean=} opt_forDialog
 */
unisubs.player.WordPressTVVideoPlayer = function(videoSource, opt_forDialog) {
    unisubs.player.AbstractVideoPlayer.call(this, videoSource);
    this.videoSource_ = videoSource;
    this.forDialog_ = !!opt_forDialog;

    this.player_ = null;
    this.playerAPIID_ = [videoSource.getUUID(),
                         '' + new Date().getTime()].join('');
    this.playerElemID_ = videoSource.getUUID() + "_wordpresstvplayer";
    this.eventFunction_ = 'event' + videoSource.getUUID();

    this.loadedFraction_ = 0;

    var readyFunc = goog.bind(this.onWordPressTVPlayerReady_, this);
    var vpReady = "wordpresstv_player_loaded";
    if (window[vpReady]) {
        var oldReady = window[vpReady];
        window[vpReady] = function(playerAPIID) {
            oldReady(playerAPIID);
            readyFunc(playerAPIID);
        };
    }
    else
        window[vpReady] = readyFunc;

    this.playerSize_ = null;
    this.player_ = null;
    /**
     * Array of functions to execute once player is ready.
     */
    this.commands_ = [];
    this.swfEmbedded_ = false;
    this.timeUpdateTimer_ = new goog.Timer(
        unisubs.player.AbstractVideoPlayer.TIMEUPDATE_INTERVAL);
};
goog.inherits(unisubs.player.WordPressTVVideoPlayer, unisubs.player.AbstractVideoPlayer);

unisubs.player.WordPressTVVideoPlayer.prototype.createDom = function() {
    // FIXME: this is copied directly from youtube video player.
    unisubs.player.WordPressTVVideoPlayer.superClass_.createDom.call(this);
    var sizeFromConfig = this.sizeFromConfig_();
    if (!this.forDialog_ && sizeFromConfig)
        this.playerSize_ = sizeFromConfig;
    else
        this.playerSize_ = this.forDialog_ ?
        unisubs.player.AbstractVideoPlayer.DIALOG_SIZE :
        unisubs.player.AbstractVideoPlayer.DEFAULT_SIZE;
};

unisubs.player.WordPressTVVideoPlayer.prototype.enterDocument = function() {
    unisubs.player.WordPressTVVideoPlayer.superClass_.enterDocument.call(this);
    if (!this.swfEmbedded_) {
        this.swfEmbedded_ = true;
        var videoSpan = this.getDomHelper().createDom('span');
        videoSpan.id = unisubs.randomString();
        this.getElement().appendChild(videoSpan);
        var params = { 'allowScriptAccess': 'always', 
                       'wmode' : 'opaque',
                       'allowfullscreen': 'true'};
        var atts = { 'id': this.playerElemID_,
                     'style': unisubs.style.setSizeInString(
                         '', this.playerSize_) };
        this.setDimensionsKnownInternal();
        var swfURL = this.createSWFURL_();
        window["swfobject"]["embedSWF"](
            this.createSWFURL_(),
            videoSpan.id, this.playerSize_.width + '',
            this.playerSize_.height + '', "8",
            null, null, params, atts);
    }
    this.getHandler().
        listen(this.timeUpdateTimer_, goog.Timer.TICK, this.timeUpdateTick_);
};

unisubs.player.WordPressTVVideoPlayer.prototype.createSWFURL_ = function() {
    var baseQuery = {};
    var config = this.videoSource_.getVideoConfig();
    if (!this.forDialog_ && config)
        baseQuery = config;
    goog.object.extend(
        baseQuery, {
            'js_api': '1',
            'width': this.playerSize_.width,
            'height': this.playerSize_.height,
            'clip_id': this.videoSource_.getVideoId(),
            'js_swf_id': this.playerAPIID_
        });

    // @todo something with baseQuery
    return 'http://wordpress.tv/unisubs/?redirect_to_swf&url=' + this.videoSource_.getVideoURL();
};

unisubs.player.WordPressTVVideoPlayer.prototype.exitDocument = function() {
    unisubs.player.WordPressTVVideoPlayer.superClass_.exitDocument.call(this);
    this.timeUpdateTimer_.stop();
};

unisubs.player.WordPressTVVideoPlayer.prototype.sizeFromConfig_ = function() {
    // FIXME: duplicates same method in youtube player
    var config = this.videoSource_.getVideoConfig();
    if (config && config['width'] && config['height'])
        return new goog.math.Size(
            parseInt(config['width']), parseInt(config['height']));
    else
        return null;
};

unisubs.player.WordPressTVVideoPlayer.prototype.getPlayheadTimeInternal = function() {
    return this.swfLoaded_ ? this.player_['api_getCurrentTime']() : 0;
};

unisubs.player.WordPressTVVideoPlayer.prototype.timeUpdateTick_ = function(e) {
    if (this.getDuration() > 0)
        this.sendTimeUpdateInternal();
};

unisubs.player.WordPressTVVideoPlayer.prototype.getDuration = function() {
    return this.player_['api_getDuration']();
};

unisubs.player.WordPressTVVideoPlayer.prototype.getBufferedLength = function() {
    return this.player_ ? 1 : 0;
};
unisubs.player.WordPressTVVideoPlayer.prototype.getBufferedStart = function(index) {
    // vimeo seems to only buffer from the start
    return 0;
};
unisubs.player.WordPressTVVideoPlayer.prototype.getBufferedEnd = function(index) {
    return this.loadedFraction_ * this.getDuration();
};
unisubs.player.WordPressTVVideoPlayer.prototype.getVolume = function() {
    return this.player_ ? this.player_['api_getVolume']() : 0.5;
};
unisubs.player.WordPressTVVideoPlayer.prototype.setVolume = function(volume) {
    if (this.player_) {
        this.player_['api_setVolume'](volume * 100);
    }
    else
        this.commands_.push(goog.bind(this.setVolume, this, volume));
};

unisubs.player.WordPressTVVideoPlayer.prototype.setPlayheadTime = function(playheadTime) {
    if (this.player_) {
        this.player_['api_seekTo'](playheadTime);
        this.sendTimeUpdateInternal();
    }
    else
        this.commands_.push(goog.bind(this.setPlayheadTime, this, playheadTime));
};

unisubs.player.WordPressTVVideoPlayer.prototype.getVideoSize = function() {
    return new goog.math.Size(unisubs.player.WordPressTVVideoPlayer.WIDTH,
                              unisubs.player.WordPressTVVideoPlayer.HEIGHT);
};

unisubs.player.WordPressTVVideoPlayer.prototype.isPausedInternal = function() {
    return !this.isPlaying_;
};
unisubs.player.WordPressTVVideoPlayer.prototype.isPlayingInternal = function() {
    return this.isPlaying_;
};
unisubs.player.WordPressTVVideoPlayer.prototype.videoEndedInternal = function() {
    return this.getPlayheadTime() == this.getDuration();
};
unisubs.player.WordPressTVVideoPlayer.prototype.playInternal = function() {
    if (this.swfLoaded_)
        this.player_['api_play']();
    else
        this.commands_.push(goog.bind(this.playInternal, this));
};
unisubs.player.WordPressTVVideoPlayer.prototype.pauseInternal = function() {
    if (this.swfLoaded_)
        this.player_['api_pause']();
    else
        this.commands_.push(goog.bind(this.pauseInternal, this));
};

unisubs.player.WordPressTVVideoPlayer.prototype.stopLoadingInternal = function() {
    this.pause();
};
unisubs.player.WordPressTVVideoPlayer.prototype.resumeLoadingInternal = function(playheadTime) {
    this.play();
};



unisubs.player.WordPressTVVideoPlayer.prototype.onWordPressTVPlayerReady_ = function(swf_id) {
    if (swf_id != this.playerAPIID_)
        return;

    this.player_ = goog.dom.$(this.playerElemID_);
    this.swfLoaded_ = true;
    goog.array.forEach(this.commands_, function(cmd) { cmd(); });
    this.commands_ = [];
    
    var that = this;

    var randomString = unisubs.randomString();

    var onLoadingFn = "onWordPressTVLoa" + randomString;
    window[onLoadingFn] = function(data, swf_id) {
        that.loadedFraction_ = data;
        that.dispatchEvent(unisubs.player.AbstractVideoPlayer.EventType.PROGRESS);
    };
    this.player_['api_addEventListener']('onLoading', onLoadingFn);

    var onFinishFn = "onWordPressTVFin" + randomString;
    window[onFinishFn] = function(data, swf_id) {
        that.dispatchEndedEvent();
    };
    this.player_['api_addEventListener']('onFinish', onFinishFn);

    var onPlayFn = "onWordPressTVPla" + randomString;
    window[onPlayFn] = function(swfID) {
        that.isPlaying_ = true;
        that.timeUpdateTimer_.start();
    };
    this.player_['api_addEventListener']('onPlay', onPlayFn);

    var onPauseFn = "onWordPressTVPau" + randomString;
    window[onPauseFn] = function(swfID) {
        that.isPlaying_ = false;
        that.timeUpdatetimer_.stop();
    };
    this.player_['api_addEventListener']('onPause', onPauseFn);
};

unisubs.player.WordPressTVVideoPlayer.prototype.getVideoSize = function() {
    return this.playerSize_;
};

unisubs.player.WordPressTVVideoPlayer.prototype.disposeInternal = function() {
    unisubs.player.WordPressTVVideoPlayer.superClass_.disposeInternal.call(this);
    this.timeUpdateTimer_.dispose();
};
