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
from datetime import datetime
from urllib2 import unquote

from django import template

from auth.models import Announcement


register = template.Library()

@register.inclusion_tag('auth/_announcement.html', takes_context=True)
def announcement(context):
    try:
        date_str = unquote(context['request'].COOKIES.get(Announcement.hide_cookie_name))
        hidden_date = datetime.strptime(date_str, Announcement.cookie_date_format)
    except (ValueError, TypeError, AttributeError):
        hidden_date = None

    return {
        'obj': Announcement.last(hidden_date),
        'cookie_name': Announcement.hide_cookie_name,
        'date': datetime.now().strftime(Announcement.cookie_date_format)
    }
