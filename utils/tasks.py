from celery.task import task

from utils import send_templated_email


@task
def send_templated_email_async(to, subject, body_template, body_dict,
                               from_email=None, ct="html", fail_silently=False,
                               check_user_preference=True):
    return send_templated_email(
        to,subject, body_template, body_dict, from_email=None, ct="html",
        fail_silently=False, check_user_preference=check_user_preference)
