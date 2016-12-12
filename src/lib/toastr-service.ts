import { Injectable } from '@angular/core';

import { Overlay } from './overlay/overlay';
import { OverlayRef } from './overlay/overlay-ref';
import { ComponentPortal } from './portal/portal';
import { ToastConfig, ToastrConfig, SingleToastConfig } from './toastr-config';

export interface ActiveToast {
  toastId: number;
  message: string;
  portal?: any;
  overlayRef?: OverlayRef;
}

@Injectable()
export class ToastrService {
  private index: number = 0;
  private toasts: any[] = [];
  private previousToastMessage: string = '';
  private currentlyActive = 0;

  constructor(
    public toastrConfig: ToastrConfig,
    private overlay: Overlay
  ) {}

  public success(message: string, title?: string, optionsOverride?: SingleToastConfig |  ToastConfig): ActiveToast {
    const type = this.toastrConfig.iconClasses.success;
    return this._buildNotification(type, message, title, this.createToastConfig(optionsOverride));
  }
  public error(message: string, title?: string, optionsOverride?: SingleToastConfig |  ToastConfig): ActiveToast {
    const type = this.toastrConfig.iconClasses.error;
    return this._buildNotification(type, message, title, this.createToastConfig(optionsOverride));
  }
  public info(message: string, title?: string, optionsOverride?: SingleToastConfig |  ToastConfig): ActiveToast {
    const type = this.toastrConfig.iconClasses.info;
    return this._buildNotification(type, message, title, this.createToastConfig(optionsOverride));
  }
  public warning(message: string, title?: string, optionsOverride?: SingleToastConfig |  ToastConfig): ActiveToast {
    const type = this.toastrConfig.iconClasses.warning;
    return this._buildNotification(type, message, title, this.createToastConfig(optionsOverride));
  }
  createToastConfig(optionsOverride: SingleToastConfig |  ToastConfig): ToastConfig {
    if (!optionsOverride)  {
      return Object.create(this.toastrConfig);
    }
    if (optionsOverride instanceof ToastConfig) {
      return optionsOverride;
    }
    return new ToastConfig(optionsOverride);
  }
  public clear(toastId?: number) {
    // Call every toast's remove function
    for (let i = 0; i < this.toasts.length; i++) {
      if (toastId !== undefined) {
        if (this.toasts[i].toastId === toastId) {
          this.toasts[i].portal._component.remove();
          return;
        }
      } else {
        this.toasts[i].portal._component.remove();
      }
    }
  }
  public remove(toastId: number): boolean {
    const { index, activeToast } = this._findToast(toastId);
    if (!activeToast) {
      return false;
    }
    activeToast.overlayRef.detach();
    this.toasts.splice(index, 1);
    this.currentlyActive = this.currentlyActive - 1;
    if (!this.toastrConfig.maxOpened || !this.toasts.length) {
      return;
    }
    if (this.currentlyActive <= this.toastrConfig.maxOpened && this.toasts[this.currentlyActive]) {
      const p = this.toasts[this.currentlyActive].portal;
      if (p._component.state === 'inactive') {
        this.currentlyActive = this.currentlyActive + 1;
        p._component.activateToast();
      }
    }
    return true;
  }
  private _findToast(toastId: number): {index: number, activeToast: ActiveToast} {
    for (let i = 0; i < this.toasts.length; i++) {
      if (this.toasts[i].toastId === toastId) {
        return { index: i, activeToast: this.toasts[i] };
      }
    }
    return { index: null, activeToast: null };
  }
  private isDuplicate(message: string): boolean {
    for (let i = 0; i < this.toasts.length; i++) {
      if (this.toasts[i].message === message) {
        return true;
      }
    }
    return false;
  }

  private _buildNotification(
    type: string,
    message: string,
    title: string,
    optionsOverride: ToastConfig = Object.create(this.toastrConfig)
  ): ActiveToast {
    // max opened and auto dismiss = true
    if (this.toastrConfig.preventDuplicates && this.isDuplicate(message)) {
      return;
    }
    this.previousToastMessage = message;
    let keepInactive = false;
    if (this.toastrConfig.maxOpened && this.currentlyActive >= this.toastrConfig.maxOpened) {
      keepInactive = true;
      if (this.toastrConfig.autoDismiss) {
        this.clear(this.toasts[this.toasts.length - 1].toastId);
      }
    }
    const component = new ComponentPortal(optionsOverride.toastComponent);
    const ins: ActiveToast = {
      toastId: this.index++,
      message,
      overlayRef: this.overlay.create(optionsOverride.positionClass),
    };
    ins.portal = ins.overlayRef.attach(component, this.toastrConfig.newestOnTop);
    ins.portal._component.toastId = ins.toastId;
    ins.portal._component.message = message;
    ins.portal._component.title = title;
    ins.portal._component.toastType = type;
    ins.portal._component.options = optionsOverride;
    if (!keepInactive) {
      setTimeout(() => {
        ins.portal._component.activateToast();
        this.currentlyActive = this.currentlyActive + 1;
      });
    }
    this.toasts.push(ins);
    return ins;
  }
}