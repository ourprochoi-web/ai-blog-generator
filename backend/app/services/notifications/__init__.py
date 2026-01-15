"""Notification services for the application."""

from backend.app.services.notifications.slack import SlackNotifier

__all__ = ["SlackNotifier"]
