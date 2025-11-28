<?php

namespace Kibamail\Enums\Transporter;

enum ContentType: string
{
    case JSON = 'application/json';
    case MULTIPART = 'multipart/form-data';
}
