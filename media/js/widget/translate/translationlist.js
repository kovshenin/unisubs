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

goog.provide('unisubs.translate.TranslationList');

/**
 *
 * @param {unisubs.subtitle.EditableCaptionSet} captionSet
 * @param {array.<object.<string, *>>} baseLanguageSubtitles Array of json base-language subs.
 * @param {string} baseLanguageTitle 
 * @extends {goog.ui.Component}
 * @constructor
 */
unisubs.translate.TranslationList = function(captionSet, baseLanguageSubtitles, baseLanguageTitle) {
    goog.ui.Component.call(this);
    this.captionSet_ = captionSet;
    this.baseLanguageTitle_ = baseLanguageTitle || '';
    /**
     * Array of subtitles in json format
     */
    this.baseLanguageSubtitles_ = baseLanguageSubtitles;
    goog.array.sort(
        this.baseLanguageSubtitles_,
        function(a, b) {
            return goog.array.defaultCompare(a['sub_order'], b['sub_order']);
        });
    /**
     * @type {Array.<unisubs.translate.TranslationWidget>}
     */
    this.translationWidgets_ = [];
    this.titleTranslationWidget_ = null;
};
goog.inherits(unisubs.translate.TranslationList, goog.ui.Component);

unisubs.translate.TranslationList.prototype.createDom = function() {
    this.setElementInternal(this.getDomHelper().createDom('ul'));
    var that = this;
    var w;

    var map = this.captionSet_.makeMap();

    goog.array.forEach(
        this.baseLanguageSubtitles_,
        function(subtitle) {
            var editableCaption = map[subtitle['subtitle_id']];
            if (!editableCaption)
                editableCaption = this.captionSet_.addNewDependentTranslation(
                    subtitle['sub_order'], subtitle['subtitle_id']);
            w = new unisubs.translate.TranslationWidget(
                subtitle, editableCaption);
            this.addChild(w, true);
            this.translationWidgets_.push(w);
        },
        this);
};

/**
 * Callback that is called by aut-translator
 * @param {Array.<string>} Array of translations
 * @param {Array.<unisubs.translate.TranslationWidget>} widgets that were translated
 * @param {?string} error happened while translating
 */
unisubs.translate.TranslationList.prototype.translateCallback_ = function(translations, widgets, error) {
    if (error) {
        
    } else {
        goog.array.forEach(translations, function(text, i) {
            widgets[i].setTranslationContent(text);
        });
    }
};

/**
 * Find widgets for all not translated subtitles and translate them with BingTranslator
 */
unisubs.translate.TranslationList.prototype.translateViaBing = function(fromLang, toLang) {
    /**
     * Translation widgets that does not contain any user's translation
     * @type {Array.<unisubs.translate.TranslationWidget>}
     */
    var needTranslating = [];

    if (this.titleTranslationWidget_ && this.titleTranslationWidget_.isEmpty()) {
        needTranslating.push(this.titleTranslationWidget_);
    };
    
    goog.array.forEach(this.translationWidgets_, function(w) {
        if (w.isEmpty()) {
            needTranslating.push(w);
        }
    });
    
    /**
     * @type {unisubs.translate.BingTranslator.translateWidgets}
     */
    var translateWidgets = unisubs.translate.BingTranslator.translateWidgets;

    needTranslating.length && translateWidgets(needTranslating, fromLang, toLang, 
        this.translateCallback_);
};
