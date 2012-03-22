// Universal Subtitles, universalsubtitles.org
// 
// Copyright (C) 2012 Participatory Culture Foundation
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

var Site = function(Site) {
    /*
     * This is the master JavaScript file for
     * the Universal Subtitles website.
     */

    var that = this;

    this.init = function() {

        // Global cached jQuery objects
        this.$html = $('html');
        this.$body = $('html');

        // Base JS (any page that extends base.html)
        if (this.$html.hasClass('base')) {
            this.Views['base']();
        }

        // Page specific JS
        if (this.$html.attr('id')) {
            this.Views[this.$html.attr('id')]();
        }

    };
    this.Utils = {
        /*
         * These are reusable utilities that are
         * usually run on multiple pages. If you
         * find duplicate code that runs on multiple
         * pages, it should be converted to a
         * utility function in this object and
         * called from each of the specific views,
         * like this:
         *     
         *     that.Utils.chosenify();
         *
         */

        chosenify: function() {
            $('select', '.v1 .content').filter(function() {
                return !$(this).parents('div').hasClass('ajaxChosen');
            }).chosen().change(function() {
                $select = $(this);

                // New message
                if ($('body').hasClass('new-message')) {
                    $option = $('option:selected', $select);

                    if ($select.attr('id') === 'id_team') {
                        if ($option.val() !== '') {
                            $('div.recipient, div.or').addClass('disabled');
                            $('select#id_user').attr('disabled', 'disabled').trigger('liszt:updated');
                        } else {
                            $('div.recipient, div.or').removeClass('disabled');
                            $('select#id_user').removeAttr('disabled').trigger('liszt:updated');
                        }
                    }
                }
            });
        },
        messagesDeleteAndSend: function() {
            $('.messages .delete').click(function(){
                if (confirm(window.DELETE_MESSAGE_CONFIRM)){
                    var $this = $(this);
                    MessagesApi.remove($this.attr('message_id'), function(response){
                        if (response.error){
                            $.jGrowl.error(response.error);
                        } else {
                            $this.parents('li.message').fadeOut('fast', function() {
                                $(this).remove();
                            });
                        }
                    });
                }
                return false;
            });
            $('#send-message-form').ajaxForm({
                type: 'RPC',
                api: {
                    submit: MessagesApi.send
                },
                success: function(data, resp, $form){
                    if (data.errors) {
                        for (key in data.errors){
                            var $field = $('input[name="'+key+'"]', $form);
                            var error = '<p class="error_list">'+data.errors[key]+'</p>';
                            if ($field.length){
                                $field.before(error);
                            }else{
                                $('.global-errors', $form).prepend(error);
                            }
                        }
                    } else {
                        if (resp.status) {
                            $.jGrowl(window.MESSAGE_SUCCESSFULLY_SENT);
                        }
                        $('a.close', '#msg_modal').click();
                        $form.clearForm();
                    }
                },
                beforeSubmit: function(formData, $form, options){
                    $('p.error_list', $form).remove();
                }
            });
        },
        resetLangFilter: function($select) {
            if (typeof $select == 'undefined') {
                $select = $('select#lang-filter');
            }
            if (window.REQUEST_GET_LANG) {
                $opt = $('option[id="lang-opt-' + window.REQUEST_GET_LANG + '"]');
            } else {
                $opt = $('option[id="lang-opt-any"]');
            }
            $select.children().removeAttr('selected');
            $opt.attr('selected', 'selected');
            $select.trigger('liszt:updated');
        },
        collapsibleLists: function($lists) {
            $.each($lists, function() {
                var $list = $(this);
                var $anchor = $('li.expand a', $list);
                var anchorTextShowAll = $anchor.children('span.all').text();
                var anchorTextShowLess = $anchor.children('span.less').text();

                $anchor.click(function(e) {
                    if ($list.hasClass('expanded')) {
                        $anchor.text(anchorTextShowAll);
                        $list.removeClass('expanded');
                        $list.addClass('collapsed');
                    } else {
                        $anchor.text(anchorTextShowLess);
                        $list.removeClass('collapsed');
                        $list.addClass('expanded');
                    }
                    e.preventDefault();
                });
            });
        }
    };
    this.Views = {
        /*
         * Each of these views runs on a specific
         * page on the Universal Subtitles site
         * (except for base, which runs on every
         * page that extends base.html)
         *
         * Adding a view is as simple as adding an
         * ID attribute to the specific page's <html>
         * element, and adding the corresponding view
         * below.
         */

        // Global
        base: function() {

            /*
             * TODO: The modules in this section need to
             * be pulled out into that.Utils and only
             * initialized on pages that use them.
             */
            if ($('.abbr').length) {
                $('.abbr').each(function(){
                    var container = $(this);
                    var content = $(this).children('div');
                    var oheight = content.css('height', 'auto').height();
                    content.css('height','6em');
                    $(this).find('.expand').live('click', function(e){
                        e.preventDefault();
                        if(container.hasClass('collapsed')){
                            content.animate({
                                height: oheight
                            }, 'fast');
                            $(this).text('Collapse ↑');
                        } else {
                            content.animate({
                                height: '6em'
                            }, 'fast');
                            $(this).text('Show all ↓');
                        }
                        container.toggleClass('collapsed expanded');
                    });
                });
            }
            if ($('#sort-filter').length) {
                $('#sort-filter').click(function(e) {
                    e.preventDefault();
                    $('.filters').toggle();
                    $(this).children('span').toggleClass('open');
                });
                $('select', '.filters').change(function(e) {
                    window.location = $(this).children('option:selected').attr('value');
                });
            }
            if ($('a.open-modal').length) {
                $('a.open-modal').live('click',function(e){
                    $target = $($(this).attr('href'));
                    $target.show();

                    $('body').append('<div class="well"></div>');

                    $target.click(function(event){
                        event.stopPropagation();
                    });
                    $('html').bind('click.modal', function() {
                        closeModal($target);
                    });
                    e.preventDefault();
                });
                $('.action-close, .close', '.bootstrap').click(function(){
                    closeModal($(this).parents('.modal'));
                    return false;
                });
                function closeModal(e) { 
                    e.hide();
                    $('body div.well').remove();
                    $('html').unbind('click.modal');
                }
            }
            $.fn.tabs = function(options){
                this.each(function(){
                    var $this = $(this);
                    
                    var $last_active_tab = $($('li.current a', $this).attr('href'));
                    $('a', $this).add($('a.link_to_tab')).click(function(){
                        var href = $(this).attr('href');
                        $last_active_tab.hide();
                        $last_active_tab = $(href).show();
                        $('li', $this).removeClass('current');
                        $('a[href='+href+']', $this).parent('li').addClass('current');
                        document.location.hash = href.split('-')[0];
                        return false;
                    });            
                });
                if (document.location.hash){
                    var tab_name = document.location.hash.split('-', 1);
                    if (tab_name) {
                        $('a[href='+tab_name+'-tab]').click();
                        document.location.href = document.location.href;
                    }
                }
                return this;        
            };
            function addCSRFHeader($){
                /* Django will guard against csrf even on XHR requests, so we need to read
                   the value from the cookie and add the header for it */
                $.ajaxSetup({
                    beforeSend: function(xhr, settings) {
                        function getCookie(name) {
                            var cookieValue = null;
                            if (document.cookie && document.cookie !== '') {
                                var cookies = document.cookie.split(';');
                                for (var i = 0; i < cookies.length; i++) {
                                    var cookie = jQuery.trim(cookies[i]);
                                    // Does this cookie string begin with the name we want?
                                    if (cookie.substring(0, name.length + 1) == (name + '=')) {
                                        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                                        break;
                                    }
                                }
                            }
                            return cookieValue;
                        }
                        if (!((/^http:.*/).test(settings.url) || (/^https:.*/).test(settings.url))) {
                            // Only send the token to relative URLs i.e. locally.
                            xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken'));
                        }
                    }
                });
            }
            $('#closeBut').click(function(){
                $('#messages').remove();
                return false;
            });
            $('li.search input').keypress(function(e) {
                if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
                    $('li.search form').submit();
                    return false;
                }
                else
                    return true;
            });
            jQuery.Rpc.on('exception', function(e){
                jQuery.jGrowl.error(e.message);
            });
            if (window.OLD_MODAL) {
                $.mod();
                $.metadata.setType("attr", "data");
            }
            if ($('#language_modal').length) {
                var cookies_are_enabled = function() {
                    document.cookie = 'testcookie';
                    return (document.cookie.indexOf('testcookie') != -1) ? true : false;
                };
                ProfileApi.get_user_languages(function(r) {
                    if (!r) {
                        return;
                    }
                    $('.language_bar span').remove();
                    var h = '';
                    for (l in r) {
                        h += '<span>'+ r[l] + '</span>, ';
                    }
                    $('.language_bar a').before('<span class="selected_language">' + h.slice(0,-2) + '</span>');
                });
                if (cookies_are_enabled()) {
                    var $w = $('#language_modal');
                    $w.find('.submit_button').click(function() {
                        var values = {};
                        var has_value = false;
                        $('select', $w).each(function(i, item) {
                            var $item = $(item);
                            values[$item.attr('name')] = $item.val();
                            if (!has_value && $item.val()) {
                                has_value = true;
                            }
                        });
                        if (!has_value) {
                            $.jGrowl.error(window.LANGUAGE_SELECT_ERROR);
                        } else {
                            $w.html(window.LANGUAGE_SELECT_SAVING);
                            ProfileApi.select_languages(values, function() {
                                    window.location.reload(true);
                                }, function() {
                                    $w.modClose();
                                }
                            );
                        }
                        return false;
                    });
                    $w.find('.close_button').click(function() {
                        $w.modClose();
                        return false;
                    });
                    if (window.FORCE_ASK) {
                        $w.mod({closeable: false});
                    } else {
                        $w.find('.close_button').show();
                    }
                } else {
                    $('#lang_select_btn').hide();
                }
            }
            if ($('div.note').length) {
                $('.note .hide-announcement').click(function() {
                    var $this = $(this);
                    $this.parents('.note').hide();
                    var d = new Date();
                    d.setTime(d.getTime() + 60*60*24*365*1000);
                    document.cookie = window.COOKIE + d.toUTCString();
                    return false;
                });
            }

            $listsCollapsible = $('ul.list-collapsible');
            if ($listsCollapsible.length) {
                that.Utils.collapsibleLists($listsCollapsible);
            }

            window.usStartTime = (new Date()).getTime();
            window.addCSRFHeader = addCSRFHeader;
            addCSRFHeader($);
        },

        // Public
        subtitle_view: function() {
            var DIFFING_URL = function() {
                var url = window.DIFFING_URL;
                return url.replace(/11111/, '<<first_pk>>').replace(/22222/, '<<second_pk>>');
            }();
            function get_compare_link(first_pk, second_pk) {
                return DIFFING_URL.replace(/<<first_pk>>/, first_pk).replace(/<<second_pk>>/, second_pk);
            }
            $('.version_checkbox:first', '.revisions').attr('checked', 'checked');
            $('.version_checkbox', '.revisions').change( function() {
                var $this = $(this);
                var checked_length = $('.version_checkbox:checked').length;

                if ($this.attr('checked') && (checked_length > 2)) {
                    $this.attr('checked', '');
                }
            });
            $('.compare_versions_button').click( function() {
                var $checked = $('.version_checkbox:checked');
                if ($checked.length !== 2) {
                    alert(window.SELECT_REVISIONS_TRANS);
                } else {
                    var url = get_compare_link($checked[0].value, $checked[1].value);
                    window.location.replace(url);
                }
            });
            $('.tabs').tabs();
            $('#add_subtitles').click( function() {
                widget_widget_div.selectMenuItem(
                unisubs.widget.DropDown.Selection.IMPROVE_SUBTITLES);
                return false;
            });
            $('.add-translation-behavior').click( function(e) {
                e.preventDefault();
                widget_widget_div.selectMenuItem(
                unisubs.widget.DropDown.Selection.ADD_LANGUAGE);
                return false;
            });
            $('.time_link').click( function() {
                widget_widget_div.playAt(parseFloat(
                $(this).find('.data').text()));
                return false;
            });
            var SL_ID = window.LANGUAGE_ID;
            unisubs.messaging.simplemessage.displayPendingMessages();
            $('#edit_subtitles_button').click( function(e) {
                if (!(localStorage && localStorage.getItem)) {
                    alert("Sorry, you'll need to upgrade your browser to use the subtitling dialog.");
                    e.preventDefault();
                }
            });
            if (window.TASK) {
                var videoSource = unisubs.player.MediaSource.videoSourceForURL(window.TASK_TEAM_VIDEO_URL);
                var opener = new unisubs.widget.SubtitleDialogOpener(
                    window.TASK_TEAM_VIDEO_ID,
                    window.TASK_TEAM_VIDEO_URL,
                    videoSource, null, null);
                opener.showStartDialog();
            }
        },
        video_view: function() {
            $('.add_subtitles').click(function() {
                widget_widget_div.selectMenuItem(
                unisubs.widget.DropDown.Selection.IMPROVE_SUBTITLES);
                return false;
            });
            $('.add-translation-behavior').click(function() {
                widget_widget_div.selectMenuItem(
                unisubs.widget.DropDown.Selection.ADD_LANGUAGE);
                return false;
            });
            $('.edit-title').click( function() {
                $('#edit-title-dialog .title-input').val($('.title-container').html());
            });
            $('#edit-title-dialog .save-title').click(function() {
                var title = $('#edit-title-dialog .title-input').val();
                if (title) {
                    $('.title-container').html(title).hide().fadeIn();
                    VideosApi.change_title_video(window.VIDEO_ID, title,
                        function(response) {
                            if (response.error) {
                                $.jGrowl.error(response.error);
                            } else {
                                $('.title-container').html(title);
                                document.title = title + ' | Universal Subtitles';
                            }
                        }
                    );
                    $('#edit-title-dialog').modClose();
                } else {
                    $.jGrowl.error(window.TITLE_ERROR);
                }
            });
            if (window.TASK) {
                var videoSource = unisubs.player.MediaSource.videoSourceForURL(
                        window.TASK_TEAM_VIDEO_URL);
                var opener = new unisubs.widget.SubtitleDialogOpener(
                                     window.TASK_TEAM_VIDEO_ID,
                                     window.TASK_TEAM_VIDEO_URL,
                                     videoSource,
                                     null,
                                     null);
                opener.showStartDialog();
            }

            $('.tabs').tabs();
            unisubs.messaging.simplemessage.displayPendingMessages();
        },

        // Teams
        team_applications: function() {
            that.Utils.chosenify();
        },
        team_members_list: function() {
            that.Utils.resetLangFilter();
            that.Utils.chosenify();
        },
        team_tasks: function() {
            $('a.action-assign').click(function(e) {

                $('div.assignee-choice').hide();

                $form = $(e.target).parents('.admin-controls').siblings('form.assign-form');

                $assignee_choice = $form.children('div.assignee-choice');
                $assignee_choice.fadeIn('fast');

                if (!window.begin_typing_trans) {
                    window.begin_typing_trans = $('option.begin-typing-trans').eq(0).text();
                }
                $select = $form.find('select');
                $select.children('option').remove();
                $select.append('<option value="">-----</option>');
                $select.append('<option value="">' + window.begin_typing_trans + '</option>');
                $select.trigger('liszt:updated');

                $chzn_container = $assignee_choice.find('.chzn-container');
                $chzn_container.css('width', '100%');

                $chzn_drop = $chzn_container.find('.chzn-drop');
                $chzn_drop.css('width', '99%');

                $chzn_input = $chzn_drop.find('input');
                $chzn_input.css('width', '82%');

                return false;
            });
            $('.assignee-choice a.cancel').click(function(e) {
                $(e.target).parents('.assignee-choice').fadeOut('fast');
                return false;
            });
            $('a.action-assign-submit').click(function(e) {
                $(e.target).closest('form').submit();
                return false;
            });
            $('a.assign-and-perform').click(function(e) {
                var $target = $(e.target);
                $target.text('Loading...');

                $.ajax({
                    url: window.ASSIGN_TASK_AJAX_URL,
                    type: 'POST',
                    data: {
                        task: $target.attr('data-id'),
                        assignee: window.ASSIGNEE
                    },
                    success: function(data, textStatus, jqXHR) {
                        $target.hide();

                        $li = $target.parent().siblings('li.hidden-perform-link');
                        $li.show();

                        $link = $li.children('a.perform');
                        $link.text('Loading...');
                        if ($link.attr('href') !== '') {
                            window.location = $link.attr('href');
                        } else {
                            $link.click();
                        }
                    }
                });

                return false;
            });
            $('div.member-ajax-chosen select', '.v1 .content').ajaxChosen({
                method: 'GET',
                url: '/en/teams/' + window.TEAM_SLUG + '/members/search/',
                dataType: 'json'
            }, function (data) {
                var terms = {};
                $.each(data.results, function (i, val) {
                    var can_perform_task = data.results[i][2];

                    if (can_perform_task) {
                        terms[data.results[i][0]] = data.results[i][1];
                    }
                });
                return terms;
            });

            unisubs.widget.WidgetController.makeGeneralSettings(window.WIDGET_SETTINGS);
            that.Utils.resetLangFilter($('select#id_task_language'));
            that.Utils.chosenify();
        },
        team_video_edit: function() {
            that.Utils.chosenify();

            var $move_form = $('form.move-video');

            $move_form.submit(function() {
                var $selected = $('select#id_team option:selected', $move_form);
                $('input[name="team_video"]', $move_form).val($selected.val());
                $('input[name="team"]', $move_form).val($selected.data('team-pk'));

                if (confirm("Warning: if you move this video, it will lose all tasks associated with it (the activity will be retained, however). Proceed?")) {
                    return true;
                } else {
                    return false;
                }
            });
        },
        team_videos_list: function() {
            $form = $('form', 'div#remove-modal');

            $('a.remove-video').click(function() {
                $form.attr('action', $(this).siblings('form').attr('action'));
            });
            $form.submit(function() {
                var $checked = $('input[name="del-opt"]:checked', 'div#remove-modal');
                if ($checked.val() == 'total-destruction') {
                    if (confirm('Are you sure you want to permanently delete this video? This action is irreversible.')) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    if (confirm('All open tasks for this video will be aborted, and in-progress subtitles will be published. Do you want to proceed?')) {
                        return true;
                    } else {
                        return false;
                    }
                }
            });

            that.Utils.resetLangFilter();
            that.Utils.chosenify();
        },
        team_settings_permissions: function() {
            $workflow = $('#id_workflow_enabled');
            
            // Fields to watch
            $subperm = $('#id_subtitle_policy');
            $transperm = $('#id_translate_policy');
            $revperm = $('#id_review_allowed');
            $appperm = $('#id_approve_allowed');

            // Inspect/observe the workflow checkbox
            if ($workflow.attr('checked')) {
                $('.v1 .workflow').show();
            }
            $workflow.change(function() {
                if ($workflow.attr('checked')) {
                    $('.v1 .workflow').show();
                    $revperm.trigger('change');
                    $appperm.trigger('change');
                } else {
                    $('.v1 .workflow').hide();
                    $('#review-step').hide();
                    $('#approve-step').hide();
                }
            });

            // Observe the permissions fields
            $subperm.change(function() {
                $('#perm-sub').html($subperm.children('option:selected').html());
            });
            $transperm.change(function() {
                $('#perm-trans').html($transperm.children('option:selected').html());
            });
            $revperm.change(function() {
                if ($revperm.children('option:selected').val() !== '0') {
                    $('#review-step').show();
                    $('#perm-rev').html($revperm.children('option:selected').html());
                } else {
                    $('#review-step').hide();
                }
            });
            $appperm.change(function() {
                if($appperm.children('option:selected').val() !== '0') {
                    $('#approve-step').show();
                    $('#perm-app').html($appperm.children('option:selected').html());
                } else {
                    $('#approve-step').hide();
                }
            });

            // Load state
            $subperm.trigger('change');
            $transperm.trigger('change');
            $revperm.trigger('change');
            $appperm.trigger('change');
        },
        team_settings_languages: function() {
            that.Utils.chosenify();
        },

        // Profile
        profile_dashboard: function() {
            unisubs.widget.WidgetController.makeGeneralSettings(window.WIDGET_SETTINGS);
        },

        // Messages
        messages_list: function() {
            var reply_msg_data;
            $.metadata.setType('attr', 'data');

            if (!window.REPLY_MSG_DATA) {
                reply_msg_data = null;
            } else {
                reply_msg_data = window.REPLY_MSG_DATA;
            }
            function set_message_data(data, $modal) {
                $('#message_form_id_user').val(data['author-id']);
                $('.author-username', $modal).html(data['author-username']);
                $('.message-content', $modal).html(data['message-content']);
                $('.message-subject').html(data['message-subject-display']);
                $('#message_form_id_subject').val('Re: '+data['message-subject']);

                if (data['can-reply']) {
                    $('.reply-container textarea', $modal).val('');
                }
                return false;
            }
            if (reply_msg_data){
                set_message_data(reply_msg_data, $('#msg_modal'));
            }
            $('.reply').bind('click', function() {
                set_message_data($(this).metadata(), $('msg_modal'));
            });
            $('.mark-read').bind('click', function(event) {
                var $link = $(this);
                var data = $link.metadata();

                if (!data['is-read']) {
                    MessagesApi.mark_as_read(data['id'], function(response) {
                        if (response.error) {
                            $.jGrowl.error(response.error);
                        } else {
                            $li = $link.parents('li.message');
                            $li.removeClass('unread');
                            $li.find('span.unread').remove();
                            data['is-read'] = true;
                            $link.parent().remove();
                        }
                    });
                }
                set_message_data(data, $('#msg_modal'));
                return false;
            });

            that.Utils.messagesDeleteAndSend();
        },
        messages_sent: function() {
            that.Utils.messagesDeleteAndSend();
        },
        messages_new: function() {
            that.Utils.chosenify();

            $('.ajaxChosen select').ajaxChosen({
                method: 'GET',
                url: '/en/messages/users/search/',
                dataType: 'json'
            }, function (data) {
                var terms = {};

                $.each(data.results, function (i, val) {
                    var name;
                    if (data.results[i][2] !== '') {
                        name = ' (' + data.results[i][2] + ')';
                    } else {
                        name = '';
                    }
                    terms[data.results[i][0]] = data.results[i][1] + name;
                });

                return terms;
            });
        }
    };
};

$(function() {
    window.site = new Site();
    window.site.init();
});
