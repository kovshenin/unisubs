# Universal Subtitles, universalsubtitles.org
# 
# Copyright (C) 2010 Participatory Culture Foundation
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

#from vidscraper.sites import wordpresstv
#from vidscraper.errors import Error as WordpresstvError
from base import VideoType, VideoTypeError
from django.conf import settings
from django.utils.html import strip_tags
import re, urllib2, simplejson

WPTV_URL_REGEX = re.compile('^https?://(www\.)?wordpress\.tv/(.+)$', re.I)
WPTV_OEMBED_URL = 'http://wordpress.tv/oembed/?'

class WordPressTVVideoType(VideoType):

    abbreviation = 'W'
    name = 'WordPress.tv'   
    site = 'wordpress.tv'

    @classmethod
    def matches_video_url(cls, url):
        return bool(WPTV_URL_REGEX.match(url))

    def __init__(self, url):
        self.url = url
        self.meta = self.get_video_meta(url)
        self.videoid = self.meta['guid']

    @property
    def video_id(self):
        return self.videoid

    @classmethod
    def video_url(cls, obj):
        if obj.url:
            return obj.url
        elif obj.videoid:
            return cls._get_permalink_from_guid(obj.videoid)

    def convert_to_video_url(self):
        return self.url

    def get_video_meta(self, url):
        oembed_file = urllib2.urlopen('http://wordpress.tv/unisubs/?url=%s' % url)
        oembed = simplejson.load(oembed_file)
        return oembed

    def set_values(self, video_obj):
        video_obj.title = self.meta['title']
        video_obj.description = self.meta['description']
        video_obj.thumbnail = self.meta['thumbnail']
        return video_obj

    @classmethod
    def _get_permalink_from_guid(cls, guid):
        return 'http://wordpress.tv/?guid=%s' % guid