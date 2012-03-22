# Universal Subtitles, universalsubtitles.org
#
# Copyright (C) 2012 Participatory Culture Foundation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see
# http://www.gnu.org/licenses/agpl-3.0.html.

from django import template
from teams.models import Team, TeamVideo, Project, TeamMember, Workflow, Task
from django.db.models import Count
from videos.models import Video
from apps.widget import video_cache
from django.conf import settings
from django.utils.translation import ugettext_lazy as _
from django.core.urlresolvers import reverse
from django.utils.http import urlencode, urlquote
from widget.views import base_widget_params

from templatetag_sugar.register import tag
from templatetag_sugar.parser import Name, Variable, Constant

from apps.teams.permissions import (
    can_view_settings_tab as _can_view_settings_tab,
    can_edit_video as _can_edit_video,
    can_rename_team as _can_rename_team,
    can_perform_task as _can_perform_task,
    can_assign_task as _can_assign_task,
    can_delete_task as _can_delete_task,
    can_remove_video as _can_remove_video,
    can_delete_video as _can_delete_video,
    can_delete_video_in_team as _can_delete_video_in_team,
    can_approve as _can_approve,
)
from apps.teams.permissions import (
    can_invite, can_add_video_somewhere,
    can_create_tasks, can_create_task_subtitle, can_create_task_translate,
    can_create_and_edit_subtitles, can_create_and_edit_translations
)


DEV_OR_STAGING = getattr(settings, 'DEV', False) or getattr(settings, 'STAGING', False)
ACTIONS_ON_PAGE = getattr(settings, 'ACTIONS_ON_PAGE', 10)

ALL_LANGUAGES_DICT = dict(settings.ALL_LANGUAGES)

register = template.Library()


def _get_team_video_from_search_record(search_record):
    if getattr(search_record, '_team_video', None):
        # This is ugly, but allows us to pre-fetch the teamvideos for the
        # search records all at once to avoid multiple DB queries.
        return search_record._team_video
    else:
        try:
            return TeamVideo.objects.get(pk=search_record.team_video_pk)
        except TeamVideo.DoesNotExist:
            return None


@register.filter
def can_approve_application(team, user):
    return can_invite(team, user)

@register.filter
def can_invite_to_team(team, user):
    return can_invite(team, user)

@register.filter
def can_edit_video(search_record, user):
    tv = _get_team_video_from_search_record(search_record)
    return _can_edit_video(tv, user)

@register.filter
def can_remove_video(tv, user):
    return _can_remove_video(tv, user)

@register.filter
def can_delete_video(tv, user):
    return _can_delete_video(tv, user)

@register.filter
def can_delete_video_in_team(user, team):
    return _can_delete_video_in_team(team, user)

@register.filter
def can_add_tasks(team, user):
    return can_create_tasks(team, user)

@register.filter
def is_team_manager(team, user):
    if not user.is_authenticated():
        return False
    return team.is_manager(user)

@register.filter
def is_team_member(team, user):
    if not user.is_authenticated():
        return False

    # We cache this here because we need to use it all over the place and
    # there's no point in making 3+ queries to the DB when one will do.
    if not hasattr(user, '_cached_teammember_status'):
        user._cached_teammember_status = {}

    if team.pk not in user._cached_teammember_status:
        user._cached_teammember_status[team.pk] = team.is_member(user)

    return user._cached_teammember_status[team.pk]

@register.filter
def user_role(team, user):
    member = TeamMember.objects.get(team=team,user=user)
    return member.role

@register.filter
def user_tasks_count(team, user):
    tasks = Task.objects.filter(team=team,assignee=user,deleted=False,completed=None)
    return tasks.count()

@register.filter
def user_project_tasks_count(project, user):
    team = project.team
    tasks = Task.objects.filter(team=team,assignee=user,team_video__project=project,deleted=False,completed=None)
    return tasks.count()

@register.inclusion_tag('teams/_team_select.html', takes_context=True)
def team_select(context, team):
    user = context['user']
    qs = Team.objects.exclude(pk=team.pk).filter(users=user)
    return {
        'team': team,
        'objects': qs,
        'can_create_team': DEV_OR_STAGING or (user.is_superuser and user.is_active)
    }


@tag(register, [])
def share_panel_email_url(context):
    project = context.get('project')
    team = context.get('team')

    if not project:
        message = 'Check out the "%s" team on Universal Subtitles: %s' % (team.name, team.get_site_url())
        share_panel_email_url = reverse('videos:email_friend')
        share_panel_email_url = "%s?%s" % (share_panel_email_url, urlencode({'text': message}))
    else:
        message = 'Check out the "%s" project on Universal Subtitles: %s' % (project.name, project.get_site_url())
        share_panel_email_url = reverse('videos:email_friend')
        share_panel_email_url = "%s?%s" % (share_panel_email_url, urlencode({'text': message}))

    return share_panel_email_url


@register.inclusion_tag('teams/_team_add_video_select.html', takes_context=True)
def team_add_video_select(context):
    request = context['request']

    #fix problem with encoding "?" in build_absolute_uri. It is not encoded,
    #so we get not same URL that page has
    location = request.get_full_path()
    context['video_absolute_url'] = request.build_absolute_uri(urlquote(location))

    user = context['user']
    if user.is_authenticated():
        qs = Team.objects.filter(users=user)
        context['teams'] = [team for team in qs if can_add_video_somewhere(team, user)]
    return context

@register.inclusion_tag('teams/_team_move_video_select.html', takes_context=True)
def team_move_video_select(context):
    user = context['user']
    if user.is_authenticated():
        team_video = context['team_video']
        if team_video:
            qs = Team.objects.filter(users=user)
            context['teams'] = [team for team in qs
                                if can_add_video_somewhere(team, user)
                                and can_remove_video(team_video, user)
                                and team.pk != team_video.team.pk]
    return context

@register.inclusion_tag('videos/_team_list.html')
def render_belongs_to_team_list(video, user):
    teams =  []
    for t in list(video.team_set.filter()):
        if t.is_visible or user in t.users.all():
            if video.moderated_by == t:
                t.moderates =True
                teams.insert(0, t)
            else:
                teams.append(t)
    return {"teams": teams}


@register.inclusion_tag('teams/_team_video_detail.html', takes_context=True)
def team_video_detail(context, team_video_search_record):
    context['search_record'] = team_video_search_record
    video_url = team_video_search_record.video_url
    context['team_video_widget_params'] = base_widget_params(context['request'], {
        'video_url': video_url,
        'base_state': {},
        'effectiveVideoURL': video_url
    })
    return context

@register.inclusion_tag('teams/_complete_team_video_detail.html', takes_context=True)
def complete_team_video_detail(context, team_video_search_record):
    context['search_record'] = team_video_search_record
    langs = team_video_search_record.video_completed_langs or ()
    urls = team_video_search_record.video_completed_lang_urls or ()
    context['display_languages'] = \
        zip([_(ALL_LANGUAGES_DICT[l]) for l in langs if (l and l in ALL_LANGUAGES_DICT)], urls)
    return context

@register.inclusion_tag('teams/_team_video_lang_detail.html', takes_context=True)
def team_video_lang_detail(context, lang, team):
    context['team_video'] = team.teamvideo_set.select_related('video').get(video__id=lang.video_id)
    context['lang'] = lang
    return context

@register.inclusion_tag('teams/_invite_friends_to_team.html', takes_context=True)
def invite_friends_to_team(context, team):
    context['invite_message'] = _(u'Can somebody help me subtitle these videos? %(url)s') % {
            'url': team.get_site_url()
        }
    return context

@register.inclusion_tag('teams/_team_video_lang_list.html', takes_context=True)
def team_video_lang_list(context, model_or_search_record, max_items=6):
    """
    max_items: if there are more items than max_items, they will be truncated to X more.
    """

    if isinstance(model_or_search_record, TeamVideo):
        video_url = reverse("teams:team_video", kwargs={"team_video_pk":model_or_search_record.pk})
    elif isinstance(model_or_search_record, Video):
        video_url =  reverse("videos:video", kwargs={"video_id":model_or_search_record.video_id})
    else:
        video_url =  reverse("teams:team_video", kwargs={"team_video_pk":model_or_search_record.team_video_pk})
    return  {
        'sub_statuses': video_cache.get_video_languages_verbose(model_or_search_record.video_id, max_items),
        "video_url": video_url ,
        }

@register.inclusion_tag('teams/_team_video_in_progress_list.html')
def team_video_in_progress_list(team_video_search_record):
    langs_raw = video_cache.writelocked_langs(team_video_search_record.video_id)

    langs = [_(ALL_LANGUAGES_DICT[x]) for x in langs_raw]
    return  {
        'languages': langs
        }

@tag(register, [Variable(), Constant("as"), Name()])
def team_projects(context, team, varname):
    """
    Sets the project list on the context, but only the non default
    hidden projects.
    Usage:
    {%  team_projects team as projects %}
        {% for project in projects %}
            project
        {% endfor %}
    If you do want to loop through all project:

    {% for p in team.project_set.all %}
      {% if p.is_default_project %}
         blah
      {% else %}
    {%endif %}
    {% endfor %}

    """
    context[varname] = Project.objects.for_team(team).annotate(Count('teamvideo'))
    return ""

@tag(register, [Variable(), Constant("as"), Name()])
def member_projects(context, member, varname):
    narrowings = member.narrowings.filter(project__isnull=False)
    context[varname] = [n.project for n in narrowings]
    return ""


@register.filter
def can_view_settings_tab(team, user):
   return _can_view_settings_tab(team, user)

@register.filter
def can_rename_team(team, user):
    return _can_rename_team(team, user)

@register.filter
def has_applicant(team, user):
    return team.applications.filter(user=user).exists()

def _team_members(team, role, countOnly):
    qs = team.members.filter(role=role)
    if countOnly:
        qs = qs.count()
    return qs

@register.filter
def contributors(team, countOnly=False):
    return _team_members(team, TeamMember.ROLE_CONTRIBUTOR, countOnly)

@register.filter
def managers(team, countOnly=False):
    return _team_members(team, TeamMember.ROLE_MANAGER, countOnly)


@register.filter
def admins(team, countOnly=False):
    return _team_members(team, TeamMember.ROLE_ADMIN, countOnly)


@register.filter
def owners(team, countOnly=False):
    return _team_members(team, TeamMember.ROLE_OWNER, countOnly)

@register.filter
def owners_and_admins(team, countOnly=False):
    qs = team.members.filter(role__in=[TeamMember.ROLE_ADMIN, TeamMember.ROLE_OWNER])
    if countOnly:
        qs = qs.count()
    return qs

@register.filter
def members(team, countOnly=False):
    qs = team.members.all()
    if countOnly:
        qs = qs.count()
    return qs

@register.filter
def can_leave_team(team, user):
    """Return True if the user can leave the team, else return False."""

    try:
        member = TeamMember.objects.get(team=team, user=user)
    except TeamMember.DoesNotExist:
        return False

    if not team.members.exclude(pk=member.pk).exists():
        False

    is_last_owner = (
        member.role == TeamMember.ROLE_OWNER
        and not team.members.filter(role=TeamMember.ROLE_OWNER).exclude(pk=member.pk).exists()
    )
    if is_last_owner:
        return False

    is_last_admin = (
        member.role == TeamMember.ROLE_ADMIN
        and not team.members.filter(role=TeamMember.ROLE_ADMIN).exclude(pk=member.pk).exists()
        and not team.members.filter(role=TeamMember.ROLE_OWNER).exists()
    )
    if is_last_admin:
        return False

    return True

@tag(register, [Variable(), Variable()])
def can_create_any_task_for_teamvideo(context, team_video, user):
    workflows = context.get('team_workflows')

    if can_create_task_subtitle(team_video, user, workflows):
        result = True
    elif can_create_task_translate(team_video, user, workflows):
        result = True
    else:
        result = False

    context['user_can_create_any_task'] = result

    return ''


@register.filter
def review_enabled(team):
    w = Workflow.get_for_target(team.id, 'team')

    if w.review_enabled:
        return True

    for p in team.project_set.all():
        if p.workflow_enabled:
            w = Workflow.get_for_project(p)
            if w.review_enabled:
                return True

    return False


@register.filter
def approve_enabled(team):
    w = Workflow.get_for_target(team.id, 'team')

    if w.approve_enabled:
        return True

    for p in team.project_set.all():
        if p.workflow_enabled:
            w = Workflow.get_for_project(p)
            if w.approve_enabled:
                return True

    return False

@register.filter
def can_perform_task(task, user):
    return _can_perform_task(user, task)

@register.filter
def can_assign_task(task, user):
    return _can_assign_task(task, user)

@register.filter
def can_delete_task(task, user):
    return _can_delete_task(task, user)


@register.filter
def can_create_subtitles_for(user, video):
    """Return True if the user can create original subtitles for this video.

    Safe to use with anonymous users as well as non-team videos.

    Usage:

        {% if request.user|can_create_subtitles_for:video %}
            ...
        {% endif %}

    """
    team_video = video.get_team_video()

    if not team_video:
        return True
    else:
        return can_create_and_edit_subtitles(user, team_video)
@register.filter
def can_create_translations_for(user, video):
    """Return True if the user can create translations for this video.

    Safe to use with anonymous users as well as non-team videos.

    Usage:

        {% if request.user|can_create_translations_for:video %}
            ...
        {% endif %}

    """
    team_video = video.get_team_video()

    if not team_video:
        return True
    else:
        return can_create_and_edit_translations(user, team_video)

@register.filter
def can_unpublish(user, video):
    """Return True if the user can unpublish subtitles for this video.

    Safe to use with anonymous users as well as non-team videos.

    Usage:

        {% if request.user|can_unpublish:video %}
            ...
        {% endif %}

    """
    team_video = video.get_team_video()

    if not team_video:
        return False

    workflow = Workflow.get_for_team_video(team_video)
    if not workflow:
        return False

    if workflow.approve_enabled:
        return _can_approve(team_video, user)

    return False

