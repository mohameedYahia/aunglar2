import { ChangeDetectionStrategy, Component, AfterViewInit, OnDestroy, inject, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

declare var ClassicEditor: any;
declare var lucide: any;

@Component({
  selector: 'app-warning-templates',
  templateUrl: './warning-templates.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class WarningTemplatesComponent implements AfterViewInit, OnDestroy {
  dataService = inject(DataService);
  
  @ViewChild('editor') editorElement!: ElementRef;
  private editorInstance: any = null;

  constructor() {
    effect(() => {
      setTimeout(() => lucide.createIcons(), 0);
    });
  }

  ngAfterViewInit(): void {
    this.initializeEditor();
  }

  ngOnDestroy(): void {
    if (this.editorInstance) {
      this.editorInstance.destroy().catch((error: any) => console.error("Error destroying editor:", error));
      this.editorInstance = null;
    }
  }

  initializeEditor(): void {
    if (this.editorElement && this.editorElement.nativeElement) {
        ClassicEditor
            .create(this.editorElement.nativeElement, {
                language: 'ar'
            })
            .then((editor: any) => {
                this.editorInstance = editor;
                editor.setData(this.dataService.warningTemplate().content);
            })
            .catch((error: any) => {
                console.error('There was a problem initializing the editor:', error);
            });
    }
  }

  saveTemplate(): void {
    if (this.editorInstance) {
      const data = this.editorInstance.getData();
      this.dataService.updateWarningTemplate(data);
      alert('تم حفظ الصيغة بنجاح!');
    } else {
      alert('المحرر غير جاهز.');
    }
  }
}
