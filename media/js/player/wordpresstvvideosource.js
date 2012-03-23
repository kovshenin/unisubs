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

goog.provide('unisubs.player.WordPressTVVideoSource');

/**
 * @constructor
 * @implements {unisubs.player.MediaSource}
 * @param {string} videoID Vimeo video id (unrelated to unisubs.player id)
 * @param {string} videoURL URL of Vimeo page
 * @param {Object.<string, *>=} opt_videoConfig Params to use for moogaloop player.
 */
unisubs.player.WordPressTVVideoSource = function(videoURL, opt_videoConfig) {
	alert(videoURL);
    this.videoURL_ = videoURL;
    this.uuid_ = unisubs.randomString();
    this.videoConfig_ = opt_videoConfig;
};

unisubs.player.WordPressTVVideoSource.prototype.createPlayer = function() {
    return this.createPlayer_(false);
};

unisubs.player.WordPressTVVideoSource.prototype.createControlledPlayer = function() {
    return new unisubs.player.ControlledVideoPlayer(this.createPlayer_(true));
};

unisubs.player.WordPressTVVideoSource.prototype.createPlayer_ = function(forDialog) {
    return new unisubs.player.WordPressTVVideoPlayer(
        new unisubs.player.WordPressTVVideoSource(this.videoURL_, this.videoConfig_),forDialog);
};

unisubs.player.WordPressTVVideoSource.prototype.getVideoId = function() {
    return this.videoID_;
};

unisubs.player.WordPressTVVideoSource.prototype.getUUID = function() {
    return this.uuid_;
};

unisubs.player.WordPressTVVideoSource.prototype.getVideoConfig = function() {
    return this.videoConfig_;
};

unisubs.player.WordPressTVVideoSource.prototype.getVideoURL = function() {
    return this.videoURL_;
};
