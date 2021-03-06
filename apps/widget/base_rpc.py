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
from django.conf.global_settings import LANGUAGES

from videos import models


LANGUAGES_MAP = dict(LANGUAGES)

class BaseRpc:
    def _make_subtitles_dict(self, subtitles, language_code, language_pk, is_original, is_complete, version, is_latest, is_forked, base_language, title, description):
        return {
            'subtitles': subtitles,
            'language_code': language_code,
            'language_name': LANGUAGES_MAP[language_code],
            'language_pk': language_pk,
            'is_original': is_original,
            'is_complete': is_complete,
            'version': version,
            'is_latest': is_latest,
            'forked': is_forked,
            'base_language': base_language and base_language.language,
            'base_language_pk': base_language and base_language.pk,
            'title': title,
            'description': description,
            }

    def get_my_user_info(self, request):
        if request.user.is_authenticated():
            return { "logged_in" : True,
                     "username" : request.user.username }
        else:
            return { "logged_in" : False }

    def logout(self, request):
        from django.contrib.auth import logout
        logout(request)
        return {"respones" : "ok"}

    def _save_packets(self, sub_collection, packets):
        subtitle_set = sub_collection.subtitle_set
        for packet in sorted(packets, key=lambda p : p['packet_no']):
            if packet['packet_no'] > sub_collection.last_saved_packet:
                self._apply_subtitle_changes(
                    sub_collection, subtitle_set, packet)
                sub_collection.last_saved_packet = packet['packet_no']
                sub_collection.save()

    def _apply_subtitle_changes(self, sub_collection, subtitle_set, packet):
        deleted = packet['deleted']
        updated = packet['updated']
        inserted = packet['inserted']

        if len(deleted) == 0 and len(inserted) == 0 and len(updated) == 0:
            return
        for d in deleted:
            subtitle_set.remove(subtitle_set.get(subtitle_id=d['subtitle_id']))
        for u in updated:
            subtitle = subtitle_set.get(subtitle_id=u['subtitle_id'])
            subtitle.update_from(u, sub_collection.is_dependent())
            subtitle.save()
        for i in inserted:
            if not subtitle_set.filter(subtitle_id=i['subtitle_id']).exists():
                if sub_collection.is_dependent():
                    subtitle = models.Subtitle(
                        subtitle_id=i['subtitle_id'],
                        subtitle_text=i['text'])
                else:
                    subtitle = models.Subtitle(
                        subtitle_id=i['subtitle_id'],
                        subtitle_text=i['text'],
                        start_time=i['start_time'],
                        end_time=i['end_time'],
                        subtitle_order=i['sub_order'])
                subtitle_set.add(subtitle)

