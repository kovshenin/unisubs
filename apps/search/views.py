# Universal Subtitles, universalsubtitles.org
#
# Copyright (C) 2011 Participatory Culture Foundation
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


from context_processors import current_site
from videos.search_indexes import VideoIndex
from search.forms import SearchForm
from search.rpc import SearchApiClass
from utils.rpc import RpcRouter
from utils import render_to
from django.http import HttpResponseRedirect
from django.utils.http import urlencode
from django.core.urlresolvers import reverse

rpc_router = RpcRouter('search:rpc_router', {
    'SearchApi': SearchApiClass()
})

@render_to('search/search.html')
def index(request):
    site = current_site(request)
    if request.GET:
        return HttpResponseRedirect(site['BASE_URL'] + '%s#/?%s' % (reverse('search:index'), urlencode(request.GET)))
    return {
        'form': SearchForm(sqs=VideoIndex.public())
    }
