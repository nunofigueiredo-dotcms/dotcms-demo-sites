package com.dotcms.demo.tsd.accessibility;

/**
 * One accessibility problem in a piece of content.
 *
 * @param field   the field's name as editors see it, e.g. "Image description (alt text)"
 * @param message what is wrong and how to fix it, in plain language
 * @param blocking true for errors that stop submit/publish; false for warnings
 */
public record Issue(String field, String message, boolean blocking) {
}
