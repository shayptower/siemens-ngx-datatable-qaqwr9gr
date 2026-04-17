import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  signal,
  inject,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import {
  DataTableColumnDirective,
  DatatableComponent,
  DatatableFooterDirective,
  DataTableFooterTemplateDirective,
  DatatablePagerComponent,
  ColumnMode,
} from '@siemens/ngx-datatable';
import { Subject, takeUntil } from 'rxjs';
import { MockDataService } from './mock-data.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    DatatableComponent,
    DataTableColumnDirective,
    DatatableFooterDirective,
    DataTableFooterTemplateDirective,
    DatatablePagerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
      <h2 style="margin: 0;">Server-Side Pagination Demo</h2>
      <button (click)="clickCount.set(clickCount() + 1)">Click me</button>
      <span>{{ clickCount() }}</span>
    </div>
    <ngx-datatable
      class="material striped"
      (page)="setPage($event, true)"
      [rows]="rows()"
      [count]="totalItems()"
      [virtualization]="true"
      [ghostLoadingIndicator]="isLoadingInfo() || isLoadingData()"
      [offset]="pageNumber()"
      [columnMode]="columnMode"
      [headerHeight]="30"
      [footerHeight]="53"
      [rowHeight]="30"
      [scrollbarV]="true"
      [scrollbarH]="true"
      [externalPaging]="true"
      [externalSorting]="true"
      (sort)="onSort($event)"
      [sorts]="sorts()"
      [messages]="{ emptyMessage: 'No data available.' }"
    >
      <ngx-datatable-column
        *ngFor="let col of columnsMetaData()"
        [name]="col.name"
        [prop]="col.name"
        sortable="true"
        canAutoResize="true"
        draggable="true"
        resizeable="true"
        [width]="col.maxWidth"
      >
        <ng-template let-value="value" ngx-datatable-cell-template>
          <span class="d-inline-block px-2" [title]="value">{{ value }}</span>
        </ng-template>
      </ngx-datatable-column>

      <ngx-datatable-footer>
        <ng-template
          ngx-datatable-footer-template
          let-rowCount="rowCount"
          let-pageSize="pageSize"
          let-curPage="curPage"
        >
          <div class="footer-content">
            <span class="total-info">
              Total : {{ totals().TOTAL_ITEMS || 0 }} |
            </span>
            <ngx-datatable-pager
              *ngIf="(rowCount / pageSize) > 1"
              style="flex: 1"
            ></ngx-datatable-pager>
          </div>
        </ng-template>
      </ngx-datatable-footer>
    </ngx-datatable>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }
      ngx-datatable {
        height: calc(100vh - 50px);
      }
      .footer-content {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 0 12px;
      }
      .total-info {
        white-space: nowrap;
        font-size: 12px;
      }
    `,
  ],
})
export class App {
  private mockData = inject(MockDataService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  clickCount = signal(0);
  columnMode = ColumnMode.force;

  columnsMetaData = signal<any[]>([]);
  rows = signal<any[]>([]);
  pageNumber = signal(0);
  sorts = signal<any[]>([]);
  totalItems = signal(0);
  totals = signal<any>({});
  isLoadingData = signal(false);
  isLoadingInfo = signal(false);

  pageStack: any[] = [];
  pre_fetch = 3;
  cache: Record<string, boolean> = {};
  cachePageSize = 0;

  private _unSub$ = new Subject<void>();

  ngAfterViewInit() {
    this.fireStartFetch();
  }

  // ---- Pagination queue (same as WIPDataTable) ----

  setPage(pageInfo: any, from_scroll_event = false) {
    this.pageStack.push({ ...pageInfo, from_scroll_event });

    if (this.pageStack.length > this.pre_fetch * 2) {
      this.pageStack = this.pageStack.slice(this.pre_fetch * -2);
    }
    if (from_scroll_event) {
      this.scheduleNext();
    }
  }

  scheduleNext() {
    if (this.isLoadingData() || this.pageStack.length === 0) return;
    this.processNext();
  }

  processNext() {
    if (this.isLoadingData() || this.pageStack.length === 0) return;
    const pageToLoad = this.pageStack.pop()!;
    this.callPage(pageToLoad);
  }

  callPage(pageInfo: any) {
    const page = {
      pageNumber: pageInfo.offset,
      size: pageInfo.pageSize,
      totalPages: Math.ceil(this.totalItems() / pageInfo.pageSize),
    };

    if (this.cachePageSize !== page.size) {
      this.cachePageSize = page.size;
      this.cache = {};
    }

    // Pre-fetch surrounding pages
    if (pageInfo.from_scroll_event && this.totalItems() > page.size) {
      for (let i = this.pre_fetch; i >= 1; i--) {
        const nextPage = page.pageNumber + i;
        const prevPage = page.pageNumber - i;
        const totalPages =
          page.totalPages ||
          Math.ceil(this.totalItems() / pageInfo.pageSize);
        if (prevPage > 0 && !this.cache[prevPage])
          this.setPage({ offset: prevPage, pageSize: pageInfo.pageSize });
        if ((!totalPages || nextPage <= totalPages) && !this.cache[nextPage])
          this.setPage({ offset: nextPage, pageSize: pageInfo.pageSize });
      }
      this.scheduleNext();
    }

    if (this.cache[page.pageNumber]) return;
    this.cache[page.pageNumber] = true;

    this.isLoadingData.set(true);

    this.mockData
      .getPage(page.pageNumber, pageInfo.pageSize)
      .pipe(takeUntil(this._unSub$))
      .subscribe((pagedData) => {
        const start = page.pageNumber * pageInfo.pageSize;
        const rows = [...this.rows()];
        rows.splice(start, pageInfo.pageSize, ...pagedData.rows);
        this.rows.set(rows);
        this.isLoadingData.set(false);
        this.cdr.markForCheck();
        this.scheduleNext();
      });
  }

  // ---- Sort ----

  onSort(event: any) {
    this.sorts.set(event.sorts);
    this.fireStartFetch();
  }

  // ---- Initial fetch (info + first page) ----

  fireStartFetch() {
    this._unSub$.complete();
    this._unSub$ = new Subject<void>();

    this.isLoadingData.set(false);
    this.pageStack = [];
    this.cache = {};

    const pageSize = this.table ? this.table.pageSize() : 20;
    this.totalItems.set(pageSize);
    this.rows.set(new Array(pageSize).fill(null));
    this.cdr.markForCheck();

    this.isLoadingInfo.set(true);

    this.mockData
      .getInfo()
      .pipe(takeUntil(this._unSub$))
      .subscribe((data) => {
        if (data.status === 200) {
          this.isLoadingInfo.set(false);
          this.totalItems.set(data.totals.TOTAL_ITEMS || 0);
          this.rows.set(
            this.totalItems()
              ? new Array(this.totalItems()).fill(null)
              : []
          );
          this.cdr.markForCheck();

          this.columnsMetaData.set(
            data.columns.map((item: any) => ({
              ...item,
              maxWidth: 0,
              width: 30,
            }))
          );

          this.totals.set(data.totals || {});
          this.cdr.markForCheck();
          this.table.onFooterPage({ page: 1 });
          this.setPage(
            { offset: 0, pageSize: this.table.pageSize() },
            true
          );
        }
      });
  }

  ngOnDestroy() {
    this._unSub$.next();
    this._unSub$.complete();
  }
}

bootstrapApplication(App);
