import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CodeReviewService } from './code-review.service';
import { MatChipInputEvent } from '@angular/material/chips';

@Component({
  selector: 'app-code-review-edit',
  templateUrl: './code-review-edit.component.html',
  styleUrls: ['./code-review-edit.component.scss'],
})
export class CodeReviewEditComponent implements OnInit {
  editForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  configId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private codeReviewService: CodeReviewService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.editForm = this.initForm();
  }

  ngOnInit() {
    this.configId = this.route.snapshot.paramMap.get('id');
    if (this.configId) {
      this.loadConfigData();
    }
    this.editForm.valueChanges.subscribe(() => {
      console.log('Form validity:', this.editForm.valid);
      console.log('Form value:', this.editForm.value);
    });
  }

  initForm(): FormGroup {
    return this.fb.group({
      description: ['', Validators.required],
      file_extensions: this.fb.group({
        include: [[], [Validators.required, this.arrayNotEmpty]],
      }),
      requires: this.fb.group({
        text: [[], [Validators.required, this.arrayNotEmpty]],
      }),
      examples: this.fb.array([], [Validators.required, this.arrayNotEmpty]),
    });
  }

  arrayNotEmpty(control: AbstractControl): ValidationErrors | null {
    const array = control.value as any[];
    return array && array.length > 0 ? null : { required: true };
  }

  loadConfigData() {
    this.isLoading = true;
    this.codeReviewService.getCodeReviewConfig(this.configId!).subscribe(
      (response) => {
        this.editForm.patchValue(response.data);
        this.isLoading = false;
      },
      (error) => {
        this.errorMessage = 'Error loading config data';
        this.isLoading = false;
      }
    );
  }

  onSubmit() {
    console.log('Submit clicked. Form validity:', this.editForm.valid);
    console.log('Form value:', this.editForm.value);
    if (this.editForm.valid) {
      this.isLoading = true;
      const formData = this.editForm.value;
      if (this.configId) {
        this.codeReviewService.updateCodeReviewConfig(this.configId, formData).subscribe(
          () => {
            this.isLoading = false;
            this.router.navigate(['/code-reviews']).catch(console.error);
          },
          (error) => {
            this.errorMessage = 'Error updating config';
            this.isLoading = false;
          }
        );
      } else {
        this.codeReviewService.createCodeReviewConfig(formData).subscribe(
          () => {
            this.isLoading = false;
            this.router.navigate(['/code-reviews']).catch(console.error);
          },
          (error) => {
            this.errorMessage = 'Error creating config';
            this.isLoading = false;
          }
        );
      }
    }
  }

  get examples() {
    return this.editForm.get('examples') as FormArray;
  }

  addExample() {
    this.examples.push(
      this.fb.group({
        code: ['', Validators.required],
        review_comment: ['', Validators.required],
      })
    );
  }

  removeExample(index: number) {
    this.examples.removeAt(index);
  }

  removeExtension(ext: string) {
    const include = this.editForm.get('file_extensions.include');
    const currentExtensions = (include?.value as string[]) || [];
    const updatedExtensions = currentExtensions.filter((e) => e !== ext);
    include?.setValue(updatedExtensions);
    include?.updateValueAndValidity();
  }

  addExtension(event: MatChipInputEvent) {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      const include = this.editForm.get('file_extensions.include');
      const currentExtensions = (include?.value as string[]) || [];
      if (!currentExtensions.includes(value.trim())) {
        include?.setValue([...currentExtensions, value.trim()]);
        include?.updateValueAndValidity();
      }
    }

    if (input) {
      input.value = '';
    }
  }

  removeRequiredText(text: string) {
    const requiredText = this.editForm.get('requires.text');
    const currentTexts = (requiredText?.value as string[]) || [];
    requiredText?.setValue(currentTexts.filter((t) => t !== text));
    requiredText?.updateValueAndValidity();
  }

  addRequiredText(event: MatChipInputEvent) {
    const input = event.input;
    const value = event.value;

    if ((value || '').trim()) {
      const requiredText = this.editForm.get('requires.text');
      const currentTexts = (requiredText?.value as string[]) || [];
      requiredText?.setValue([...currentTexts, value.trim()]);
      requiredText?.updateValueAndValidity();
    }

    if (input) {
      input.value = '';
    }
  }
}
