from unittest import TestCase

from sentry.utils.functional import compact


class CompactTest(TestCase):
    def test_none(self):
        assert compact({"foo": None, "bar": 1}) == {"bar": 1}

    def test_zero(self):
        assert compact({"foo": 0}) == {"foo": 0}

    def test_false(self):
        assert compact({"foo": False}) == {"foo": False}

    def test_empty_string(self):
        assert compact({"foo": ""}) == {"foo": ""}
