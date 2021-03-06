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

goog.provide('unisubs.subtitle.OnSavedDialog');

/**
 * @constructor
 * @private
 */
unisubs.subtitle.OnSavedDialog = function(msg, callback, mode) {
    goog.ui.Dialog.call(this, 'unisubs-modal-completed', true);
    this.setButtonSet(null);
    this.setDisposeOnHide(true);
    this.callback_ = callback;
    this.msg_ = msg;
    this.mode_ = mode;
};
goog.inherits(unisubs.subtitle.OnSavedDialog, goog.ui.Dialog);


unisubs.subtitle.OnSavedDialog.prototype.createDom = function() {
    unisubs.subtitle.OnSavedDialog.superClass_.createDom.call(this);
    var $d = goog.bind(this.getDomHelper().createDom, this.getDomHelper());

    var title;
    if (this.mode_ === 'review') {
        title = "Review saved";
    } else if (this.mode_ === 'approve') {
        title = "Approval saved";
    } else {
        title = "Subtitles saved";
    }

    this.getElement().appendChild($d('h3', null, title));

    this.getElement().appendChild(
        $d('div', null,
           $d('p', null, 
              this.checkboxSpan_,
              goog.dom.createTextNode(
                  this.msg_))));
    this.okButton_ = 
        $d('a', 
           {'href':'#', 
            'className': "unisubs-green-button unisubs-big"}, 
           'OK');
    this.getElement().appendChild(this.okButton_);
    var clearDiv = $d('div');
    unisubs.style.setProperty(clearDiv, 'clear', 'both');
    clearDiv.innerHTML = "&nbsp;";
    this.getElement().appendChild(clearDiv);
};

unisubs.subtitle.OnSavedDialog.prototype.enterDocument = function() {
    unisubs.subtitle.OnSavedDialog.superClass_.enterDocument.call(this);
    this.getHandler().listen(
        this.okButton_, 'click', this.okClicked_);
};

unisubs.subtitle.OnSavedDialog.prototype.okClicked_ = function(e) {
    e.preventDefault();
    this.setVisible(false);
    this.callback_();
};

/**
 * @param {string} The msg to display to the end user
 * @param {function(boolean)} callback
 */
unisubs.subtitle.OnSavedDialog.show = function(msg, callback, mode) {
    var dialog = new unisubs.subtitle.OnSavedDialog(
        msg, callback, mode);
    dialog.setVisible(true);
};
