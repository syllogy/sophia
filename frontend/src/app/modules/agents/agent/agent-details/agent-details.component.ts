import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import { AgentContext, AgentRunningState } from '../../agent.types';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from 'environments/environment';
import { catchError, finalize } from 'rxjs/operators';
import {map, of, throwError} from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { FunctionEditModalComponent } from '../function-edit-modal/function-edit-modal.component';
import { ResumeAgentModalComponent } from '../resume-agent-modal/resume-agent-modal.component';
import {MatSelectModule} from "@angular/material/select";
import {MatCheckboxModule} from "@angular/material/checkbox";
import {MatRadioModule} from "@angular/material/radio";
import {FunctionsService} from "../../services/function.service";

@Component({
    selector: 'agent-details',
    templateUrl: './agent-details.component.html',
    styleUrl: 'agent-details.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatListModule,
        MatButtonModule,
        MatIconModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
    ],
})
export class AgentDetailsComponent implements OnInit {
    @Input() agentDetails!: AgentContext;

    feedbackForm!: FormGroup;
    hilForm!: FormGroup;
    errorForm!: FormGroup;
    isSubmitting = false;
    isResumingError = false;
    userPromptExpanded = false;
    outputExpanded = false;
    allAvailableFunctions: string[] = []; // Initialize with an empty array or fetch from a service
    llmNameMap: Map<string, string> = new Map();

    constructor(
        private formBuilder: FormBuilder,
        private http: HttpClient,
        private snackBar: MatSnackBar,
        private dialog: MatDialog,
        private functionsService: FunctionsService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {}

    ngOnInit(): void {
        this.initializeFeedbackForm();
        this.initializeHilForm();
        this.initializeErrorForm();
        // Load available functions here, possibly from a service
        this.functionsService.getFunctions().subscribe(value =>
        this.allAvailableFunctions = value)
        this.http
            .get<{ data: Array<{ id: string; name: string }> }>(`/apillms/list`)
            .pipe(
                map((response) => {
                    console.log(response);
                    return response.data as Array<{ id: string; name: string }>;
                })
            )
            .subscribe((llms) => {
                this.llmNameMap = new Map(llms.map((llm) => [llm.id, llm.name]));
            });
    }

    private initializeFeedbackForm(): void {
        this.feedbackForm = this.formBuilder.group({
            feedback: ['', Validators.required],
        });
    }

    private initializeHilForm(): void {
        this.hilForm = this.formBuilder.group({
            feedback: [''],
        });
    }

    private initializeErrorForm(): void {
        this.errorForm = this.formBuilder.group({
            errorDetails: ['', Validators.required],
        });
    }

    onSubmitFeedback(): void {
        if (!this.feedbackForm.valid) return;
        const feedback = this.feedbackForm.get('feedback')?.value;
        this.isSubmitting = true;
        this.http
            .post(`/api/agent/v1/feedback`, {
                agentId: this.agentDetails.agentId,
                executionId: this.agentDetails.executionId,
                feedback: feedback,
            })
            .pipe(
                catchError((error) => {
                    console.error('Error submitting feedback:', error);
                    this.snackBar.open('Error submitting feedback', 'Close', { duration: 3000 });
                    return of(null);
                }),
                finalize(() => {
                    this.isSubmitting = false;
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.snackBar.open('Feedback submitted successfully', 'Close', { duration: 3000 });
                    // Optionally reload or update agent details
                }
            });
    }

    onResumeHil(): void {
        if (!this.hilForm.valid) return;
        this.isSubmitting = true;
        const feedback = this.hilForm.get('feedback')?.value;
        this.http
            .post(`/api/agent/v1/resume-hil`, {
                agentId: this.agentDetails.agentId,
                executionId: this.agentDetails.executionId,
                feedback,
            })
            .pipe(
                catchError((error) => {
                    console.error('Error resuming agent:', error);
                    this.snackBar.open('Error resuming agent', 'Close', { duration: 3000 });
                    return of(null);
                }),
                finalize(() => {
                    this.isSubmitting = false;
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.snackBar.open('Agent resumed successfully', 'Close', { duration: 3000 });
                    this.hilForm.reset();
                    // Optionally reload or update agent details
                }
            });
    }

    onResumeError(): void {
        if (!this.errorForm.valid) return;
        this.isResumingError = true;
        const errorDetails = this.errorForm.get('errorDetails')?.value;
        this.http
            .post(`/api/agent/v1/resume-error`, {
                agentId: this.agentDetails.agentId,
                executionId: this.agentDetails.executionId,
                feedback: errorDetails,
            })
            .pipe(
                catchError((error) => {
                    console.error('Error resuming agent:', error);
                    this.snackBar.open('Error resuming agent', 'Close', { duration: 3000 });
                    return of(null);
                }),
                finalize(() => {
                    this.isResumingError = false;
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.snackBar.open('Agent resumed successfully', 'Close', { duration: 3000 });
                    this.errorForm.reset();
                    // Optionally reload or update agent details
                }
            });
    }

    cancelAgent(): void {
        this.http
            .post(`/api/agent/v1/cancel`, {
                agentId: this.agentDetails.agentId,
                executionId: this.agentDetails.executionId,
                reason: 'None provided',
            })
            .pipe(
                catchError((error) => {
                    console.error('Error cancelling agent:', error);
                    this.snackBar.open('Error cancelling agent', 'Close', { duration: 3000 });
                    return of(null);
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.snackBar.open('Agent cancelled successfully', 'Close', { duration: 3000 });
                    // Optionally reload or update agent details
                }
            });
    }

    displayState(state: AgentRunningState): string {
        switch (state) {
            case 'agent':
                return 'Agent control loop';
            case 'functions':
                return 'Calling functions';
            case 'error':
                return 'Error';
            case 'hil':
                return 'Human-in-the-loop check';
            case 'feedback':
                return 'Agent requested feedback';
            case 'completed':
                return 'Completed';
            default:
                return state;
        }
    }

    refreshAgentDetails(): void {
        // Implement this method to refresh agent details
        // You might need to emit an event to the parent component to handle this
    }

    traceUrl(agent: AgentContext): string {
        return `https://console.cloud.google.com/traces/list?referrer=search&project=${environment.gcpProject}&supportedpurview=project&pageState=(%22traceIntervalPicker%22:(%22groupValue%22:%22P1D%22,%22customValue%22:null))&tid=${agent.traceId}`;
    }

    agentUrl(agent: AgentContext): string {
        return `https://console.cloud.google.com/firestore/databases/${
            environment.firestoreDb || '(default)'
        }/data/panel/AgentContext/${agent?.agentId}?project=${environment.gcpProject}`;
    }

    getLlmName(llmId: string): string {
        // Implement this method to get LLM name from ID
        // You might need to inject a service that provides this information
        return this.llmNameMap.get(llmId) || llmId;
    }

    openFunctionEditModal(): void {
        console.log('Opening function edit modal');
        console.log('Current functions:', this.agentDetails.functions);
        console.log('All available functions:', this.allAvailableFunctions);

        const dialogRef = this.dialog.open(FunctionEditModalComponent, {
            width: '400px',
            data: {
                functions: this.agentDetails.functions || [],       // Ensure it's an array
                allFunctions: this.allAvailableFunctions || [],     // Ensure it's an array
            },
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                console.log('Dialog closed with result:', result);
                this.saveFunctions(result);
            } else {
                console.log('Dialog closed without result');
            }
        });
    }

    saveFunctions(selectedFunctions: string[]): void {
        // this.isSavingFunctions = true;
        this.http
            .post(`/api/agent/v1/update-functions`, {
                agentId: this.agentDetails.agentId,
                functions: selectedFunctions,
            })
            .pipe(
                catchError((error) => {
                    console.error('Error updating agent functions:', error);
                    this.snackBar.open('Error updating agent functions', 'Close', { duration: 3000 });
                    return throwError(() => new Error('Error updating agent functions'));
                }),
                finalize(() => {
                    // this.isSavingFunctions = false;
                })
            )
            .subscribe({
                next: () => {
                    this.snackBar.open('Agent functions updated successfully', 'Close', { duration: 3000 });
                    this.agentDetails.functions = selectedFunctions;
                    this.changeDetectorRef.markForCheck();
                },
            });
    }

    openResumeModal(): void {
        const dialogRef = this.dialog.open(ResumeAgentModalComponent, {
            width: '500px',
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.resumeCompletedAgent(result.resumeInstructions);
            }
        });
    }

    private resumeCompletedAgent(resumeInstructions: string): void {
        this.isSubmitting = true;
        this.http
            .post(`/api/agent/v1/resume-completed`, {
                agentId: this.agentDetails.agentId,
                executionId: this.agentDetails.executionId,
                instructions: resumeInstructions,
            })
            .pipe(
                catchError((error) => {
                    console.error('Error resuming completed agent:', error);
                    this.snackBar.open('Error resuming completed agent', 'Close', { duration: 3000 });
                    return of(null);
                }),
                finalize(() => {
                    this.isSubmitting = false;
                })
            )
            .subscribe((response) => {
                if (response) {
                    this.snackBar.open('Agent resumed successfully', 'Close', { duration: 3000 });
                    // Optionally reload or update agent details
                }
            });
    }
}
