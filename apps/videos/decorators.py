import re

from django.core.exceptions import SuspiciousOperation
from django.http import HttpResponseForbidden
from django.shortcuts import  get_object_or_404
from django.utils.functional import  wraps

from icanhaz.models import VideoVisibilityPolicy
from videos.models import Video, SubtitleVersion


SHA1_RE = re.compile('^[a-f0-9]{40}$')
def get_video_from_code(func):
    """
    Wraps a view with a signature such as view(request, video_id, ...)
    to -> view(request, video, ...), where video is a Video instance
    and authorization credentials for viewing have been checked
    for the user on that request.
    """
    def raise_forbidden(request, video):
        return HttpResponseForbidden("You cannot see this video")

    def wrapper(request, video_id, *args, **kwargs):
        # check if this is a a sha1 hash
        if SHA1_RE.search(video_id):
            # secret, find the url for this
            video = VideoVisibilityPolicy.objects.video_for_user(
                request.user, video_id)

            if not video:
                return raise_forbidden(request, video)
        else:
            video = get_object_or_404(Video, video_id=video_id)
            video =  VideoVisibilityPolicy.objects.video_for_user(
                request.user, video)

            if not video:
                return raise_forbidden(request, video_id)

        # Hack to pass through the ID (which may be the secret version) in case
        # the view wants to redirect.
        video._video_id_used = video_id

        return func(request, video, *args, **kwargs)
    return wraps(func)(wrapper)

def get_video_revision(func):
    """
    Wraps a view with a signature such as view(request, pk, ...)
    to -> view(request, version, ...), where version is a SubtitleVersion instance
    and authorization credentials for viewing have been checked
    for the user on that request.
    """
    def auth_video_id(request, video_id):
        video = VideoVisibilityPolicy.objects.video_for_user(
            request.user,
            video_id)
        if not video:
            raise SuspiciousOperation("You cannot see this video")
        return video

    def wrapper(request, video_id=None,pk=None, *args, **kwargs):
        version = get_object_or_404(SubtitleVersion, pk=pk)

        if video_id:
            # check if this is a a sha1 hash
            if SHA1_RE.search(video_id):
                # secret, check for authorization
                auth_video_id(request, video_id)
            else:
                get_object_or_404(Video, video_id=version.video.video_id)
        else:
            # no video, old legacy format for public urls, see if
            # user can access
            auth_video_id(request, version.video.video_id)

        return func(request, version, *args, **kwargs)
    return wraps(func)(wrapper)
