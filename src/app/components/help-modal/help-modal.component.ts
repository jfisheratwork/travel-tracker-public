// DOCS: https://angular.dev/api/core/Component
import { Component, EventEmitter, HostListener, Output } from '@angular/core';
// DOCS: https://angular.dev/api/common/CommonModule
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help-modal.component.html',
})
export class HelpModalComponent {
  // DOCS: https://angular.dev/api/core/Output
  @Output() close = new EventEmitter<void>();

  // DOCS: https://angular.dev/api/core/HostListener
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
