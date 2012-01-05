"""Email backend that sends email to both file based and smtp backends.
Loops through all recipients (to, bcc, cc) and removes all non white listed
addresses before sending through smtp.
Requires the setting:
EMAIL_NOTIFICATION_RECEIVERS = (sequence of emails or email terminations)
Example:
EMAIL_NOTIFICATION_RECEIVERS = ("arthur@example.com", "@pculture.org")
Will only send email to the first anddress and any emails ending with @pculture.org
This way, only unisubs crew will ever receive notifications.
"""


from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend as SmtpBackend
from django.core.mail.backends.filebased import EmailBackend as FileBackend


class InternalOnlyBackend(object):
    def __init__(self, *args, **kwargs):
        self.file_backend = FileBackend(*args, **kwargs) 
        self.smtp_backend = SmtpBackend(*args, **kwargs )
        self.white_listed_addresses = getattr(settings, "EMAIL_NOTIFICATION_RECEIVERS", [])

    def get_whitelisted(self, addresses):
        clean = []
        for x in addresses:
            # addresses might be in form Name <email>
            start,end = x.find("<"), x.find(">")
            if start != -1 and end != -1:
               if x[start+1:end] in self.white_listed_addresses: 
                clean.append(x)
            elif x in self.white_listed_addresses:
                clean.append(x)
            else:
                for white_listed in self.white_listed_addresses:
                    if x.endswith(white_listed):
                        clean.append(x)
                        break
        return clean
        
    def send_messages(self, email_messages):
        self.file_backend.send_messages(email_messages)
        for message in email_messages:
            message.to = self.get_whitelisted(message.to)
            message.bcc = self.get_whitelisted(message.bcc)
            message.cc = self.get_whitelisted(message.cc)
        self.smtp_backend.send_messages(email_messages)
