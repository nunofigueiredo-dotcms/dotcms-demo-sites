package com.dotcms.demo.tsd.accessibility;

import com.dotcms.rest.config.RestServiceUtil;
import com.dotmarketing.osgi.GenericBundleActivator;
import com.dotmarketing.util.Logger;
import org.osgi.framework.BundleContext;

/** Registers the workflow step and the REST endpoint when the plugin starts, and removes them when it stops. */
public class Activator extends GenericBundleActivator {

    @Override
    public void start(BundleContext context) throws Exception {
        initializeServices(context);
        registerActionlet(context, new CheckAccessibilityActionlet());
        RestServiceUtil.addResource(AccessibilityResource.class);
        Logger.info(this, "TSD accessibility check started");
    }

    @Override
    public void stop(BundleContext context) throws Exception {
        RestServiceUtil.removeResource(AccessibilityResource.class);
        unregisterActionlets();
        unregisterServices(context);
        Logger.info(this, "TSD accessibility check stopped");
    }
}
